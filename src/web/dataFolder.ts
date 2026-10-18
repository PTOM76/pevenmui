// 設定と自動保存した作業を、追加機能の保存先のフォルダーにも写す（PWA を消しても戻せるように）。画面と自動保存の Worker の両方から使う
import { ADDON_FOLDER_KEY } from '../addons/folder'

type Dir = FileSystemDirectoryHandle & { queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState> }
type Entries = { entries(): AsyncIterable<[string, FileSystemHandle]> }

export interface DataFolderOptions {
  /** アプリの ID（フォルダーの中に `<appId>-data` を作る） */
  appId: string
  /** アプリの IndexedDB の読み出し（フォルダーのハンドルを読む） */
  idbGet: (key: string) => Promise<unknown>
  /** このアプリの localStorage の項目の接頭辞（`wevocalsynth.` など） */
  localPrefix: string
  /** 写さない localStorage の項目（その場かぎりの印など） */
  skipLocal?: (key: string) => boolean
  /** 写す自動保存のキーの接頭辞（既定は autosave） */
  autosavePrefix?: string
}

export type DataFolder = ReturnType<typeof createDataFolder>

const AUTOSAVE_DIR = 'autosave'
/** 設定と画面の状態（localStorage の項目をまとめたもの） */
const SETTINGS_FILE = 'settings.json'
/** フォルダーの写しの ID（このブラウザが写してよいかを見分ける。入れ直したブラウザが、空の設定で写しを上書きしないため） */
const ID_FILE = 'id.txt'

interface StoredClip {
  sampleRate: number
  channels: Float32Array[]
}
const isChannels = (v: unknown): v is Float32Array[] => Array.isArray(v) && v.length > 0 && v.every((c) => c instanceof Float32Array)
const isClip = (v: unknown): v is StoredClip => isChannels((v as StoredClip | null)?.channels)

/** 音声を 1 つのファイルにする: [見出しの長さ u32][見出しの JSON][各チャンネルの Float32]。チャンネルの配列だけのもの（bare）もそのまま戻す */
function encodeClip(v: StoredClip | Float32Array[]): Blob {
  const bare = Array.isArray(v)
  const channels = bare ? v : v.channels
  const head = new TextEncoder().encode(JSON.stringify({ sampleRate: bare ? 0 : v.sampleRate, channels: channels.length, length: channels[0]?.length ?? 0, ...(bare && { bare }) }))
  return new Blob([new Uint32Array([head.length]), head, ...channels] as BlobPart[])
}
async function decodeClip(file: File): Promise<StoredClip | Float32Array[]> {
  const buf = await file.arrayBuffer()
  const n = new DataView(buf).getUint32(0, true)
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n))) as { sampleRate: number; channels: number; length: number; bare?: boolean }
  // Float32Array は 4 バイト境界から始める必要があるので、チャンネルごとに複製する
  let at = 4 + n
  const channels = Array.from({ length: head.channels }, () => {
    const ch = new Float32Array(buf.slice(at, at + head.length * 4))
    at += head.length * 4
    return ch
  })
  return head.bare ? channels : { sampleRate: head.sampleRate, channels }
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable()
  await w.write(data)
  await w.close()
}

// 16 進数だけの名前なら Windows の禁止文字や URI の % がファイル名に入らない
const encodedKey = (key: string) => `key-${[...new TextEncoder().encode(key)].map((b) => b.toString(16).padStart(2, '0')).join('')}`
const fileOf = (key: string, clip: boolean) => `${encodedKey(key)}${clip ? '.clip' : '.json'}`
const legacyFileOf = (key: string, clip: boolean) => `${encodeURIComponent(key)}${clip ? '.clip' : '.json'}`
const keyOf = (name: string) => {
  const stem = name.replace(/\.(clip|json)$/, '')
  if (!stem.startsWith('key-')) return decodeURIComponent(stem)
  const hex = stem.slice(4)
  const bytes = Uint8Array.from({ length: hex.length / 2 }, (_, i) => Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16))
  return new TextDecoder().decode(bytes)
}

/** 指定したフォルダーへの写し（WeVocalSynth、WeVocal Studio で共通） */
export function createDataFolder(o: DataFolderOptions) {
  const dataDirName = `${o.appId}-data`
  const prefix = o.autosavePrefix ?? 'autosave'
  /** このブラウザがつながっている写しの ID（localStorage。写しに含まれるので、戻すと同じ ID になる） */
  const linkKey = `${o.localPrefix}dataFolderId`

  const rootDir = async (): Promise<Dir | null> => {
    const dir = (await o.idbGet(ADDON_FOLDER_KEY).catch(() => null)) as Dir | null
    return dir && (await dir.queryPermission({ mode: 'readwrite' }).catch(() => 'denied')) === 'granted' ? dir : null
  }
  /** データの置き場所。選んでいないか、許可がなければ null */
  const dataDir = async (create: boolean) => ((await rootDir())?.getDirectoryHandle(dataDirName, { create }).catch(() => null) ?? null) as Dir | null
  const autosaveDir = async (create: boolean) => (await dataDir(create))?.getDirectoryHandle(AUTOSAVE_DIR, { create }).catch(() => null) ?? null

  /** このアプリの localStorage の項目 */
  const localItems = () => {
    const out: Record<string, string> = {}
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith(o.localPrefix) && !o.skipLocal?.(key)) out[key] = localStorage.getItem(key) ?? ''
    } catch {
      // localStorage が使えない環境では写すものがない
    }
    return out
  }
  let lastSettings = ''

  const readSettings = async () => {
    const file = await (await dataDir(false))?.getFileHandle(SETTINGS_FILE).then((h) => h.getFile(), () => null)
    return file ? (JSON.parse(await file.text()) as Record<string, string>) : null
  }
  const readWork = async (): Promise<[string, unknown][]> => {
    const dir = await autosaveDir(false)
    if (!dir) return []
    const files: [string, FileSystemFileHandle][] = []
    for await (const [name, h] of (dir as unknown as Entries).entries()) {
      if (h.kind !== 'file') continue
      files.push([name, h as FileSystemFileHandle])
    }
    const out: [string, unknown][] = []
    for (let i = 0; i < files.length; i += 4) {
      const batch = await Promise.all(files.slice(i, i + 4).map(async ([name, handle]) => {
        const file = await handle.getFile()
        return [keyOf(name), name.endsWith('.clip') ? await decodeClip(file) : JSON.parse(await file.text())] as [string, unknown]
      }))
      out.push(...batch)
    }
    return out
  }

  const api = {
    /** 写す自動保存のキー */
    isMirroredKey: (key: string) => key.startsWith(prefix),

    /** 自動保存した `key` を写す。フォルダーを使えなければ何もしない */
    async mirrorPut(key: string, value: unknown) {
      const dir = await autosaveDir(true)
      if (!dir) return
      const clip = isClip(value) || isChannels(value)
      await writeFile(dir, fileOf(key, clip), clip ? encodeClip(value) : JSON.stringify(value))
      // 種類が変わったときも、旧形式の URI 符号化ファイルを移行したときも古い方を残さない
      for (const old of [fileOf(key, !clip), legacyFileOf(key, clip), legacyFileOf(key, !clip)]) await dir.removeEntry(old).catch(() => {})
    },

    /** 写した `keys` を消す */
    async mirrorDelete(keys: string[]) {
      const dir = await autosaveDir(false)
      if (!dir) return
      for (const key of keys) for (const clip of [true, false]) {
        await dir.removeEntry(fileOf(key, clip)).catch(() => {})
        await dir.removeEntry(legacyFileOf(key, clip)).catch(() => {})
      }
    },

    /** 写した作業をすべて消す（設定の「作業データを削除」） */
    async mirrorClearWork() {
      await (await dataDir(false))?.removeEntry(AUTOSAVE_DIR, { recursive: true }).catch(() => {})
    },

    /** 写した作業を読み出す（`[キー, 値]`。フォルダーを使えなければ空） */
    readMirroredWork: readWork,

    /**
     * 写しとこのブラウザの関係。unavailable: 使えない、empty: 写しがない、linked: このブラウザの写し、
     * other: ほかのブラウザ（入れ直す前など）の写し
     */
    async folderLink(): Promise<'unavailable' | 'empty' | 'linked' | 'other'> {
      const dir = await dataDir(false)
      if (!dir) return (await dataDir(true)) ? 'empty' : 'unavailable'
      const file = await dir.getFileHandle(ID_FILE).then((h) => h.getFile(), () => null)
      if (!file) return 'empty'
      return (await file.text()) === localStorage.getItem(linkKey) ? 'linked' : 'other'
    },

    /** このブラウザを写しにつなぐ（写しがなければ ID を作る。あれば、それを上書きしてよいことにする） */
    async linkFolder() {
      const dir = await dataDir(true)
      if (!dir) return
      const file = await dir.getFileHandle(ID_FILE).then((h) => h.getFile(), () => null)
      const id = file ? await file.text() : crypto.randomUUID()
      if (!file) await writeFile(dir, ID_FILE, id)
      localStorage.setItem(linkKey, id)
    },

    /** 設定と画面の状態（localStorage）を、前に写したときから変わっていれば写す */
    async mirrorLocalSettings() {
      const items = localItems()
      const json = JSON.stringify(items)
      if (json === lastSettings) return
      const dir = await dataDir(true)
      if (!dir) return
      await writeFile(dir, SETTINGS_FILE, json)
      lastSettings = json
    },

    /** 写した設定と画面の状態を localStorage に戻す。戻したら true（そのあと再読み込みする） */
    async restoreLocalSettings() {
      const items = await readSettings()
      if (!items) return false
      for (const [key, value] of Object.entries(items)) if (key.startsWith(o.localPrefix)) localStorage.setItem(key, value)
      lastSettings = JSON.stringify(items)
      return true
    },

    /** 写した設定と作業を戻す（`put` で IndexedDB に書く）。何か戻したら true（そのあと再読み込みする） */
    async restore(put: (key: string, value: unknown) => Promise<unknown>, putMany?: (entries: [string, unknown][]) => Promise<unknown>) {
      const settings = await api.restoreLocalSettings()
      const work = await readWork()
      if (putMany) await putMany(work)
      else for (const [key, value] of work) await put(key, value)
      // 戻したあとは、このブラウザから写し続ける
      await api.linkFolder()
      return settings || work.length > 0
    },

    /** 写したデータの大きさ（バイト） */
    async mirroredSize() {
      const walk = async (dir: FileSystemDirectoryHandle): Promise<number> => {
        let total = 0
        for await (const [, h] of (dir as unknown as Entries).entries())
          total += h.kind === 'file' ? (await (h as FileSystemFileHandle).getFile()).size : await walk(h as FileSystemDirectoryHandle)
        return total
      }
      const dir = await dataDir(false)
      return dir ? walk(dir) : 0
    },

    /** 写したデータをすべて消す */
    async mirrorClearAll() {
      await (await rootDir())?.removeEntry(dataDirName, { recursive: true }).catch(() => {})
    },
  }
  return api
}

export interface DataFolderSyncOptions {
  /** 写すかを決めたとき（自動保存の Worker に伝える）。`resync` は今ある作業をまとめて写し直すとき */
  onLinked: (linked: boolean, resync: boolean) => void
  /** ほかのブラウザ（入れ直す前など）の写しがあったとき。戻すか上書きするかを聞く */
  onOther: (restore: () => void, overwrite: () => void) => void
  /** 戻す（アプリの IndexedDB に書いて、再読み込みする） */
  restore: () => void
  /** フォルダーを選び直したときと、許可したときに呼ばれるように登録する（追加機能の変化。戻り値で外す） */
  onChanged: (cb: () => void) => () => void
}

/** 設定と自動保存の写しを始める（設定の「指定したフォルダーに保存する」がオンの間）。戻り値で止める */
export function startDataFolderSync(folder: DataFolder, o: DataFolderSyncOptions) {
  let linked = false
  const sync = () => void (linked && folder.mirrorLocalSettings().catch(() => {}))
  // このブラウザの写しのときだけ写す
  const check = async () => {
    const link = await folder.folderLink()
    if (link === 'empty') await folder.linkFolder()
    linked = link === 'empty' || link === 'linked'
    o.onLinked(linked, linked)
    if (linked) sync()
    if (link === 'other') o.onOther(o.restore, () => void folder.linkFolder().then(check))
  }
  void check()
  const off = o.onChanged(() => void check())
  // 画面の状態（パネルの幅など）は設定とは別に変わるので、数秒ごとと、隠れたときに写す（変わっていなければ書かない）
  const timer = setInterval(sync, 5000)
  const hide = () => document.visibilityState === 'hidden' && sync()
  document.addEventListener('visibilitychange', hide)
  return () => {
    off()
    clearInterval(timer)
    document.removeEventListener('visibilitychange', hide)
    o.onLinked(false, false)
  }
}
