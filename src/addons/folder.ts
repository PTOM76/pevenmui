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
}
type DirWindow = Window & { showDirectoryPicker?: (o?: { id?: string; mode?: 'readwrite' }) => Promise<DirHandle> }

/** この環境でフォルダーを選べるか */
export const addonFolderSupported = (win: Window = window) => typeof win !== 'undefined' && !!(win as DirWindow).showDirectoryPicker

export type AddonFolder = ReturnType<typeof createAddonFolder>

/** `idb` にハンドルを残し、選んだフォルダーの中の `dirName` に置く */
export function createAddonFolder(idb: Idb, dirName: string) {
  // 設定がオンか（アプリが設定から入れる）
  let enabled = false

  const saved = async () => ((await idb.get(ADDON_FOLDER_KEY).catch(() => null)) as DirHandle | null) ?? null

  // 許可があるときの、追加機能を置くフォルダー（`create` なら作る）。使えなければ null
  const root = async (create: boolean): Promise<DirHandle | null> => {
    const dir = await saved()
    if (!dir || (await dir.queryPermission({ mode: 'readwrite' })) !== 'granted') return null
    return dir.getDirectoryHandle(dirName, { create }).catch(() => null)
  }
  const addonDir = async (id: string, create: boolean) => (await root(create))?.getDirectoryHandle(id, { create }).catch(() => null) ?? null

  // `path`（a/b.wasm）のファイルの、入っているフォルダーと名前
  const locate = async (id: string, path: string, create: boolean): Promise<[DirHandle, string] | null> => {
    const parts = path.split('/').filter(Boolean)
    let dir = await addonDir(id, create)
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
    async write(id: string, path: string, data: ArrayBuffer | string) {
      const at = await locate(id, path, true)
      if (!at) throw new Error('追加機能の保存先のフォルダーに書き込めません')
      const w = await (await at[0].getFileHandle(at[1], { create: true })).createWritable()
      await w.write(typeof data === 'string' ? new Blob([data]) : data)
      await w.close()
    },
    /** ファイルを読む（なければ null） */
    async read(id: string, path: string): Promise<File | null> {
      const at = await locate(id, path, false)
      return at ? at[0].getFileHandle(at[1]).then((h) => h.getFile(), () => null) : null
    },
    async remove(id: string) {
      await (await root(false))?.removeEntry(id, { recursive: true }).catch(() => {})
    },
    /** 選んだフォルダーの中の `dirName` をすべて消す */
    async clear() {
      const dir = await saved()
      if (dir && (await dir.queryPermission({ mode: 'readwrite' })) === 'granted') await dir.removeEntry(dirName, { recursive: true }).catch(() => {})
    },
  }
}
