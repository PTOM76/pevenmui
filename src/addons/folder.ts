import type { Idb } from '../web/idb'

/**
 * 追加機能の保存先のフォルダー（試験的）。Chrome、Edge の File System Access API。
 * 選んだフォルダーの中の `<dirName>/<id>/<ファイル>` に置き、Service Worker がそこから返す（vite.ts の pevenAddonsRoute）
 */

/** フォルダーのハンドルを残すキー（pevenAddonsRoute と一致させる） */
export const ADDON_FOLDER_KEY = 'addonFolder'

type Mode = { mode: 'readwrite' }
interface DirHandle {
  name: string
  queryPermission(d: Mode): Promise<PermissionState>
  requestPermission(d: Mode): Promise<PermissionState>
  getDirectoryHandle(name: string, o?: { create?: boolean }): Promise<DirHandle>
  getFileHandle(name: string, o?: { create?: boolean }): Promise<{ getFile(): Promise<File>; createWritable(): Promise<{ write(d: BufferSource | Blob): Promise<void>; close(): Promise<void> }> }>
  removeEntry(name: string, o?: { recursive?: boolean }): Promise<void>
  values(): AsyncIterable<{ kind: 'file' | 'directory'; name: string }>
}
type DirWindow = Window & { showDirectoryPicker?: (o?: { id?: string; mode?: 'readwrite' }) => Promise<DirHandle> }

/** この環境でフォルダーを選べるか */
export const addonFolderSupported = (win: Window = window) => typeof win !== 'undefined' && !!(win as DirWindow).showDirectoryPicker

export type AddonFolder = ReturnType<typeof createAddonFolder>

/**
 * `idb` にハンドルを残し、選んだフォルダーの中の `dirName` に置く。`oldDirs` は前の置き場所（読む、消すときだけ見る）。
 * `dirName` をアプリの間で共通にすると、同じフォルダーを選んだアプリどうしで同じ追加機能を使える
 */
export function createAddonFolder(idb: Idb, dirName: string, oldDirs: string[] = []) {
  // 設定がオンか（アプリが設定から入れる）
  let enabled = false

  const saved = async () => ((await idb.get(ADDON_FOLDER_KEY).catch(() => null)) as DirHandle | null) ?? null

  const granted = async () => {
    const dir = await saved()
    return dir && (await dir.queryPermission({ mode: 'readwrite' })) === 'granted' ? dir : null
  }
  // 許可があるときの、追加機能を置くフォルダー（`create` なら作る）。使えなければ null
  const root = async (create: boolean, name = dirName): Promise<DirHandle | null> => (await granted())?.getDirectoryHandle(name, { create }).catch(() => null) ?? null
  // 今の置き場所と、前の置き場所（あるものだけ）
  const roots = async () => (await Promise.all([dirName, ...oldDirs].map((n) => root(false, n)))).filter((d): d is DirHandle => !!d)

  // `path`（a/b.wasm）のファイルの、入っているフォルダーと名前
  const locateIn = async (top: DirHandle | null, id: string, path: string, create: boolean): Promise<[DirHandle, string] | null> => {
    const parts = path.split('/').filter(Boolean)
    let dir = top ? await top.getDirectoryHandle(id, { create }).catch(() => null) : null
    for (const p of parts.slice(0, -1)) dir = dir ? await dir.getDirectoryHandle(p, { create }).catch(() => null) : null
    return dir ? [dir, parts[parts.length - 1]] : null
  }

  return {
    setEnabled(on: boolean) {
      enabled = on
    },
    /** 選んだフォルダー（なければ null） */
    saved,
    /**
     * フォルダーを選んで残す。選んだフォルダーの名前を返す（やめたら null。それ以外の失敗は投げる）。
     * `win` は操作した窓（ほかの窓から選ぶ画面を出すとブラウザに断られる）
     */
    async choose(win: Window = window): Promise<string | null> {
      const pick = (win as DirWindow).showDirectoryPicker
      if (!pick) return null
      let dir: DirHandle
      try {
        dir = await pick.call(win, { id: dirName, mode: 'readwrite' })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return null
        throw e
      }
      await idb.put(ADDON_FOLDER_KEY, dir)
      return dir.name
    },
    /** 選んだフォルダーを忘れる（中のファイルは消さない） */
    forget: () => idb.delete(ADDON_FOLDER_KEY),
    /** フォルダーへのアクセスの状態。選んでいなければ null */
    async permission(): Promise<PermissionState | null> {
      const dir = await saved()
      return dir ? dir.queryPermission({ mode: 'readwrite' }) : null
    },
    /** アクセスの許可を求める（押したボタンの中で呼ぶ） */
    async requestPermission(): Promise<boolean> {
      const dir = await saved()
      return !!dir && (await dir.requestPermission({ mode: 'readwrite' })) === 'granted'
    },
    /** 導入でフォルダーを使うか（設定がオンで、フォルダーを選んでいて、許可がある） */
    installsTo: async () => enabled && !!(await root(true)),
    /** フォルダーを選んでいて、書き込みの許可がある（設定を保存する前でも、移す操作で使う） */
    writable: async () => !!(await root(true)),
    async write(id: string, path: string, data: ArrayBuffer | string) {
      const at = await locateIn(await root(true), id, path, true)
      if (!at) throw new Error('追加機能の保存先のフォルダーに書き込めません')
      const w = await (await at[0].getFileHandle(at[1], { create: true })).createWritable()
      await w.write(typeof data === 'string' ? new Blob([data]) : data)
      await w.close()
    },
    /** ファイルを読む（今の置き場所、前の置き場所の順に探す。なければ null） */
    async read(id: string, path: string): Promise<File | null> {
      for (const top of await roots()) {
        const at = await locateIn(top, id, path, false)
        const file = at && (await at[0].getFileHandle(at[1]).then((h) => h.getFile(), () => null))
        if (file) return file
      }
      return null
    },
    /** 置いてある id の一覧（フォルダーの名前） */
    async list(): Promise<string[]> {
      const ids = new Set<string>()
      for (const dir of await roots()) for await (const e of dir.values()) if (e.kind === 'directory') ids.add(e.name)
      return [...ids]
    },
    async remove(id: string) {
      for (const dir of await roots()) await dir.removeEntry(id, { recursive: true }).catch(() => {})
    },
    /** 選んだフォルダーの中の置き場所（前のものも）をすべて消す */
    async clear() {
      const dir = await granted()
      if (dir) for (const n of [dirName, ...oldDirs]) await dir.removeEntry(n, { recursive: true }).catch(() => {})
    },
  }
}
