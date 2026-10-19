// 導入できるものの置き場の共通の層（Cache Storage と、選んだフォルダー）。アプリが導入するプラグインなど、ファイルの束を id ごとに保存する。
// 追加機能の置き場（addons/store.ts）と同じ考え方で、保存先は Cache Storage を基本にして、フォルダーが使えるときはそこにも置く

/** 保存先のフォルダー（addons/folder.ts の AddonFolder と同じ形のうち、使うもの） */
export interface PackageFolder {
  installsTo(): Promise<boolean>
  write(id: string, path: string, data: ArrayBuffer | string): Promise<void>
  read(id: string, path: string): Promise<File | null>
  remove(id: string): Promise<void>
  /** 置いてある id の一覧 */
  list(): Promise<string[]>
}

export interface PackageStoreOptions {
  /** Cache Storage の名前 */
  cache: string
  /** フォルダーにも置くとき */
  folder?: PackageFolder
}

export type PackageStore = ReturnType<typeof createPackageStore>

/** Cache Storage 内の仮の住所（実在しない）。`<cache>/<id>/<path>` */
const urlOf = (cache: string, id: string, path: string) => `https://packages.invalid/${encodeURIComponent(cache)}/${encodeURIComponent(id)}/${path}`

export function createPackageStore(o: PackageStoreOptions) {
  const open = () => caches.open(o.cache)
  const supported = () => typeof caches !== 'undefined'

  /** 通常は Cache Storage から読み、フォルダーが有効ならそちらを優先する */
  async function get(id: string, path: string): Promise<ArrayBuffer | null> {
    const folderFirst = !!o.folder && (await o.folder.installsTo())
    if (folderFirst) {
      const file = await o.folder!.read(id, path).catch(() => null)
      if (file) return file.arrayBuffer()
    }
    if (supported()) {
      const hit = await (await open()).match(urlOf(o.cache, id, path)).catch((e) => {
        if (!o.folder) throw e
        return undefined
      })
      if (hit) return hit.arrayBuffer()
    }
    const file = await o.folder?.read(id, path).catch(() => null)
    if (!file) return null
    const buf = await file.arrayBuffer()
    if (supported() && !folderFirst) {
      await (await open()).put(urlOf(o.cache, id, path), new Response(buf)).catch((e) => console.warn('package cache mirror failed', e))
    }
    return buf
  }

  return {
    /** id のファイル一式を置く（同じ id は置き換える）。フォルダーが有効なら先に保存し、Cache Storage に収まらなくても使えるようにする */
    async put(id: string, files: Record<string, string | ArrayBuffer>) {
      const folderFirst = !!o.folder && (await o.folder.installsTo())
      if (folderFirst) for (const [path, data] of Object.entries(files)) await o.folder!.write(id, path, data)
      if (!supported()) {
        if (folderFirst) return false
        throw new Error('Cache Storage is unavailable and no plugin folder is enabled')
      }
      try {
        await this.remove(id, false)
        const cache = await open()
        for (const [path, data] of Object.entries(files)) await cache.put(urlOf(o.cache, id, path), new Response(data))
        return true
      } catch (e) {
        if (folderFirst) return false
        throw e
      }
    },
    get,
    async getText(id: string, path: string) {
      const buf = await get(id, path)
      return buf ? new TextDecoder().decode(buf) : null
    },
    /** 置いてある id の一覧（Cache Storage とフォルダーの両方。重複は除く） */
    async ids(): Promise<string[]> {
      const set = new Set<string>()
      if (supported()) {
        const prefix = `https://packages.invalid/${encodeURIComponent(o.cache)}/`
        try {
          for (const req of await (await open()).keys()) if (req.url.startsWith(prefix)) set.add(decodeURIComponent(req.url.slice(prefix.length).split('/')[0]))
        } catch (e) {
          if (!o.folder) throw e
          console.warn('package cache listing failed; using the selected folder', e)
        }
      }
      for (const id of (await o.folder?.list().catch(() => [])) ?? []) set.add(id)
      return [...set].sort()
    },
    /** id を消す（Cache Storage とフォルダー） */
    async remove(id: string, folderToo = true) {
      if (supported()) {
        const cache = await open()
        const prefix = urlOf(o.cache, id, '')
        for (const req of await cache.keys()) if (req.url.startsWith(prefix)) await cache.delete(req)
      }
      if (folderToo) await o.folder?.remove(id).catch(() => {})
    },
  }
}

/** 追加機能の保存先のフォルダー（addons.folder）を、id に prefix を付けて PackageFolder として使う（追加機能と同じフォルダーを共用する） */
export function packageFolderOf(folder: PackageFolder, prefix: string): PackageFolder {
  // Some selected-folder providers reject DLL extensions, so store the binary under a neutral name.
  const folderPath = (path: string) => (path === 'plugin.dll' ? 'plugin.bin' : path)
  return {
    installsTo: () => folder.installsTo(),
    write: (id, path, data) => folder.write(prefix + id, folderPath(path), data),
    async read(id, path) {
      const storedPath = folderPath(path)
      const file = await folder.read(prefix + id, storedPath)
      return file ?? (storedPath === path ? null : folder.read(prefix + id, path))
    },
    remove: (id) => folder.remove(prefix + id),
    list: async () => (await folder.list()).filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)),
  }
}
