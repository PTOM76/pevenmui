// ZIP（無圧縮）を作る。ファイル名は UTF-8（日本語の Windows 向けに、かなを Shift_JIS で書くこともできる）。React に依存しないので Worker からも使える

export interface ZipEntry {
  /** フォルダーは / で区切る */
  name: string
  data: Blob | ArrayBuffer | Uint8Array
}

export interface ZipOptions {
  /**
   * ファイル名をかなまで Shift_JIS で書き、UTF-8 の名前は拡張フィールド（0x7075）に入れる。
   * 日本語の Windows のエクスプローラーは UTF-8 の印を見ずに Shift_JIS として読むので、かなの名前が壊れて展開できないのを防ぐ
   */
  shiftJisNames?: boolean
}

let table: Uint32Array | null = null

/** CRC-32（ZIP と同じ多項式） */
function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** ASCII とかな（ひらがな、カタカナ、ー）だけの名前を Shift_JIS にする。ほかの字があれば null */
function kanaShiftJis(name: string): Uint8Array | null {
  const out: number[] = []
  for (const ch of name) {
    const c = ch.codePointAt(0)!
    if (c < 0x80) out.push(c)
    // ぁ〜ん は 0x829F〜0x82F1 に同じ順で並ぶ
    else if (c >= 0x3041 && c <= 0x3093) out.push(0x82, 0x9f + (c - 0x3041))
    // ァ〜ヶ は 0x8340〜0x8396（0x837F は飛ばす）。ゔ はカタカナの ヴ にする
    else if ((c >= 0x30a1 && c <= 0x30f6) || c === 0x3094) {
      const t = 0x40 + (c === 0x3094 ? 0x30f4 : c) - 0x30a1
      out.push(0x83, t >= 0x7f ? t + 1 : t)
    } else if (c === 0x30fc) out.push(0x81, 0x5b)
    else return null
  }
  return new Uint8Array(out)
}

/** Info-ZIP の Unicode Path 拡張フィールド（0x7075）。`raw` は書いた名前、`utf8` は本当の名前 */
function unicodePathExtra(raw: Uint8Array, utf8: Uint8Array): Uint8Array {
  const v = new DataView(new ArrayBuffer(9 + utf8.length))
  v.setUint16(0, 0x7075, true)
  v.setUint16(2, 5 + utf8.length, true)
  v.setUint8(4, 1)
  v.setUint32(5, crc32(raw), true)
  new Uint8Array(v.buffer).set(utf8, 9)
  return new Uint8Array(v.buffer)
}

/** 今の時刻を DOS の形（時刻、日付） */
function dosTime(d = new Date()): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return [time, date]
}

/** `entries` をまとめた ZIP。4GB を超えるもの（ZIP64）には対応しない */
export async function createZip(entries: ZipEntry[], options: ZipOptions = {}): Promise<Blob> {
  const enc = new TextEncoder()
  const [time, date] = dosTime()
  const parts: BlobPart[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const e of entries) {
    // Blob に入れられるよう、ArrayBuffer を持つ形にそろえる（Uint8Array は SharedArrayBuffer のこともある）
    const data = e.data instanceof Blob ? new Uint8Array(await e.data.arrayBuffer()) : new Uint8Array(e.data)
    const utf8 = enc.encode(e.name)
    const sjis = options.shiftJisNames && utf8.some((b) => b >= 0x80) ? kanaShiftJis(e.name) : null
    const name = sjis ?? utf8
    const extra = sjis ? unicodePathExtra(sjis, utf8) : new Uint8Array(0)
    const flags = sjis ? 0 : 0x0800
    const crc = crc32(data)
    // ローカルヘッダー（30 バイト + 名前）。0x0800 はファイル名が UTF-8 の印
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, flags, true)
    local.setUint16(8, 0, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, extra.length, true)
    parts.push(local.buffer, name, extra, data)
    // 中央ディレクトリ（46 バイト + 名前 + 拡張）
    const c = new DataView(new ArrayBuffer(46 + name.length + extra.length))
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, flags, true)
    c.setUint16(12, time, true)
    c.setUint16(14, date, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, data.length, true)
    c.setUint32(24, data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint16(30, extra.length, true)
    c.setUint32(42, offset, true)
    new Uint8Array(c.buffer).set(name, 46)
    new Uint8Array(c.buffer).set(extra, 46 + name.length)
    central.push(new Uint8Array(c.buffer))
    offset += 30 + name.length + extra.length + data.length
  }
  const size = central.reduce((s, c) => s + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
