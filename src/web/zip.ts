// ZIP（無圧縮）を作る。ファイル名は UTF-8（かなのファイル名もそのまま開ける）。React に依存しないので Worker からも使える

export interface ZipEntry {
  /** フォルダーは / で区切る */
  name: string
  data: Blob | ArrayBuffer | Uint8Array
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

/** 今の時刻を DOS の形（時刻、日付） */
function dosTime(d = new Date()): [number, number] {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return [time, date]
}

/** `entries` をまとめた ZIP。4GB を超えるもの（ZIP64）には対応しない */
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const enc = new TextEncoder()
  const [time, date] = dosTime()
  const parts: BlobPart[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const e of entries) {
    // Blob に入れられるよう、ArrayBuffer を持つ形にそろえる（Uint8Array は SharedArrayBuffer のこともある）
    const data = e.data instanceof Blob ? new Uint8Array(await e.data.arrayBuffer()) : new Uint8Array(e.data)
    const name = enc.encode(e.name)
    const crc = crc32(data)
    // ローカルヘッダー（30 バイト + 名前）。0x0800 はファイル名が UTF-8 の印
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)
    local.setUint16(8, 0, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    parts.push(local.buffer, name, data)
    // 中央ディレクトリ（46 バイト + 名前）
    const c = new DataView(new ArrayBuffer(46 + name.length))
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(12, time, true)
    c.setUint16(14, date, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, data.length, true)
    c.setUint32(24, data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    new Uint8Array(c.buffer).set(name, 46)
    central.push(new Uint8Array(c.buffer))
    offset += 30 + name.length + data.length
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
