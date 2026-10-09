import type { Idb } from '../web/idb'
import { createAddonFolder } from './folder'

/**
 * 追加機能（アドオン）。使いたい人だけが導入し、導入後はオフラインでも使える。
 * - 配信: `<base>addons/<id>/manifest.json` とファイル一式（アプリと同じ場所）
 * - 保存先: アプリ本体とは別の Cache Storage（アプリの更新では消えない）。試験的に、選んだフォルダーにも置ける（folder.ts）
 * - 読み込み: Service Worker（vite.ts の pevenAddonsRoute）が保存先から返すので、普通に `import()` できる
 */

export interface AddonFile {
  path: string
  /** 元の大きさ（バイト）。配信が gzip だと Content-Length は圧縮後になるので、進捗はこれで出す */
  size: number
  sha256: string
  /** 取りに行く場所（ほかのサイトにあるモデルなど）。省くと追加機能のフォルダーの `path`。どちらでも、保存先には `path` の名前で置く */
  url?: string
}

export interface AddonManifest {
  id: string
  version: string
  /** `import()` するファイル（モデルだけの追加機能は null） */
  entry: string | null
  files: AddonFile[]
}

export interface AddonInfo<N extends string = string> {
  id: string
  /** 名前（アプリの訳文のキー。部品には AddonsProvider の nameOf で渡す） */
  name: N
  /** 設定の一覧に出す短い名前 */
  shortName?: N
  /** 先に導入が要る追加機能（導入するときに一緒に入れる） */
  requires?: string[]
  /** ほかの追加機能を使うときに一緒に入れるもの（使うものがなくなったら一緒に消す） */
  companion?: boolean
}

export interface AddonsOptions<N extends string> {
  /** アプリの id（保存先の名前 `<id>-addons` に使う。pevenAddonsRoute と一致させる） */
  appId: string
  /** アプリの IndexedDB（保存先のフォルダーのハンドルを残す） */
  idb: Idb
  /** 配信している追加機能 */
  addons: AddonInfo<N>[]
  /** 配信の基準の URL（`import.meta.env.BASE_URL`） */
  base: string
}

export const addonSize = (m: AddonManifest) => m.files.reduce((s, f) => s + f.size, 0)

/** この環境で使えるか（Cache Storage は https か localhost でしか使えない） */
export const addonsSupported = () => typeof caches !== 'undefined'

async function sha256(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** `res` を最後まで読む。読んだ分（展開後のバイト数）を `onBytes` に渡す */
async function readAll(res: Response, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  if (!res.body) return res.arrayBuffer()
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
    onBytes(value.length)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out.buffer
}

export type Addons<N extends string = string> = ReturnType<typeof createAddons<N>>

/** アプリの追加機能の導入、削除、読み込み */
export function createAddons<N extends string>(o: AddonsOptions<N>) {
  const ADDONS = o.addons
  const cacheName = `${o.appId}-addons`
  const folder = createAddonFolder(o.idb, cacheName)
  const baseUrl = (id: string) => new URL(`${o.base}addons/${id}/`, location.href)
  const manifestUrl = (id: string) => new URL('manifest.json', baseUrl(id)).href

  // 導入、削除のたびに知らせる（メニューに出すかを決め直すため）
  const listeners = new Set<() => void>()
  const changed = () => listeners.forEach((fn) => fn())

  /** `id` と、その導入に要る追加機能（依存を先に並べる） */
  const withRequires = (id: string): string[] => {
    const info = ADDONS.find((a) => a.id === id)
    return [...new Set([...(info?.requires ?? []).flatMap(withRequires), id])]
  }

  /** 導入済みならそのマニフェスト、なければ null */
  const installedManifest = async (id: string): Promise<AddonManifest | null> => {
    if (!addonsSupported()) return null
    const res = await (await caches.open(cacheName)).match(manifestUrl(id))
    if (res) return res.json()
    // 選んだフォルダーに入れたもの（許可がなければ未導入として扱う）
    const file = await folder.read(id, 'manifest.json').catch(() => null)
    return file ? JSON.parse(await file.text()) : null
  }

  /** 取得して大きさとハッシュを確かめる */
  const fetchChecked = async (m: AddonManifest, f: AddonFile, onBytes: (n: number) => void, signal?: AbortSignal) => {
    // 導入済みの古い版が Service Worker から返らないよう、クエリを付けて保存先と別の URL にする（ほかのサイトのものは、版を含む URL をそのまま使う）
    const src = f.url ?? `${new URL(f.path, baseUrl(m.id)).href}?v=${encodeURIComponent(m.version)}`
    const res = await fetch(src, { cache: 'no-store', signal })
    if (!res.ok) throw new Error(`${f.path}: HTTP ${res.status}`)
    const buf = await readAll(res, onBytes)
    if (buf.byteLength !== f.size || (await sha256(buf)) !== f.sha256) throw new Error(`${f.path}: 内容が一致しません`)
    return { buf, type: res.headers.get('content-type') ?? 'application/octet-stream' }
  }

  /** 追加機能のファイルをすべて消す */
  const uninstall = async (id: string) => {
    if (!addonsSupported()) return
    const cache = await caches.open(cacheName)
    const base = baseUrl(id).href
    for (const req of await cache.keys()) {
      if (req.url.startsWith(base)) await cache.delete(req)
    }
    await folder.remove(id)
    changed()
  }

  /**
   * `m` のファイルをすべて取得し、確かめてから保存する。マニフェストは最後に保存する（あれば導入済みとみなすため）。
   * 途中で失敗・中断したら、その追加機能をすべて消す。`onProgress` は 0〜1
   */
  const install = async (m: AddonManifest, onProgress: (p: number) => void, signal?: AbortSignal) => {
    const toFolder = await folder.installsTo()
    const cache = await caches.open(cacheName)
    const base = baseUrl(m.id)
    const total = addonSize(m) || 1
    let loaded = 0
    const onBytes = (n: number) => onProgress(Math.min(1, (loaded += n) / total))
    try {
      // フォルダーに入れるときは、Cache Storage にある前の版を先に消す
      if (toFolder) await uninstall(m.id)
      for (const f of m.files) {
        const { buf, type } = await fetchChecked(m, f, onBytes, signal)
        if (toFolder) await folder.write(m.id, f.path, buf)
        else await cache.put(new URL(f.path, base).href, new Response(buf, { headers: { 'content-type': type } }))
      }
      if (toFolder) await folder.write(m.id, 'manifest.json', JSON.stringify(m))
      else {
        await cache.put(manifestUrl(m.id), new Response(JSON.stringify(m), { headers: { 'content-type': 'application/json' } }))
        // 前の版にだけあったファイルを消す
        const keep = new Set([manifestUrl(m.id), ...m.files.map((f) => new URL(f.path, base).href)])
        for (const req of await cache.keys()) {
          if (req.url.startsWith(base.href) && !keep.has(req.url)) await cache.delete(req)
        }
      }
      changed()
    } catch (e) {
      await uninstall(m.id)
      throw e
    }
  }

  /** Cache Storage に入っている追加機能（選んだフォルダーへ移せるもの） */
  const cachedIds = async (): Promise<string[]> => {
    if (!addonsSupported()) return []
    const cache = await caches.open(cacheName)
    const out: string[] = []
    for (const a of ADDONS) if (await cache.match(manifestUrl(a.id))) out.push(a.id)
    return out
  }

  /**
   * Cache Storage の追加機能を、選んだフォルダーへ移す（1 つずつ。ファイル、マニフェストの順に書き、書けてから Cache Storage から消す）。
   * 途中で失敗しても、Cache Storage のものは残るので使い続けられる。`onProgress(移した数, 全部の数)`。移した数を返す
   */
  const moveToFolder = async (onProgress?: (done: number, total: number) => void): Promise<number> => {
    if (!(await folder.installsTo())) throw new Error('追加機能の保存先のフォルダーに書き込めません')
    const ids = await cachedIds()
    const cache = await caches.open(cacheName)
    for (const [i, id] of ids.entries()) {
      const m = (await (await cache.match(manifestUrl(id)))!.json()) as AddonManifest
      try {
        for (const f of m.files) {
          const res = await cache.match(new URL(f.path, baseUrl(id)).href)
          if (!res) throw new Error(`${id}/${f.path} が見つかりません`)
          await folder.write(id, f.path, await res.arrayBuffer())
        }
        await folder.write(id, 'manifest.json', JSON.stringify(m))
      } catch (e) {
        // 書きかけのものは消す（Cache Storage のものはそのまま）
        await folder.remove(id)
        throw e
      }
      const base = baseUrl(id).href
      for (const req of await cache.keys()) if (req.url.startsWith(base)) await cache.delete(req)
      onProgress?.(i + 1, ids.length)
    }
    changed()
    return ids.length
  }

  return {
    ADDONS,
    cacheName,
    cachedIds,
    moveToFolder,
    folder,
    withRequires,
    installedManifest,
    install,
    uninstall,
    /** 追加機能の中のファイルの URL（導入済みなら Service Worker が保存先から返す） */
    addonFileUrl: (id: string, path: string) => new URL(path, baseUrl(id)).href,
    /** 配信中のマニフェスト（HTTP キャッシュを通さず取り直す） */
    async fetchManifest(id: string): Promise<AddonManifest> {
      // 導入済みだと Service Worker が保存先のマニフェストを返すので、クエリを付けて別の URL にする
      const res = await fetch(`${manifestUrl(id)}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    /** 導入済みかが変わったことを知らせる（フォルダーへのアクセスを許可したときなど） */
    notifyAddonsChanged: changed,
    /** 追加機能を導入、削除したときに `fn` を呼ぶ。戻り値で解除する */
    onAddonsChanged(fn: () => void) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    /** `id` を消し、それが依存していた追加機能のうち、ほかから使われなくなったものも消す */
    async uninstallWithUnused(id: string) {
      await uninstall(id)
      const installed = new Set<string>()
      for (const a of ADDONS) if (await installedManifest(a.id)) installed.add(a.id)
      for (const dep of withRequires(id).filter((d) => d !== id)) {
        // 一緒に入れるもの（companion）以外に、使っているものがなければ消す。そのとき一緒に入れたものも消す
        const used = ADDONS.some((a) => installed.has(a.id) && a.id !== dep && !a.companion && withRequires(a.id).includes(dep))
        if (used) continue
        for (const c of ADDONS.filter((a) => a.companion && withRequires(a.id).includes(dep))) await uninstall(c.id)
        await uninstall(dep)
      }
    },
    /** 導入済みの追加機能の合計の大きさ（バイト） */
    async installedAddonsSize(): Promise<number> {
      let total = 0
      for (const a of ADDONS) {
        const m = await installedManifest(a.id)
        if (m) total += addonSize(m)
      }
      return total
    },
    /** 置き場所ごとの、導入済みの追加機能の合計の大きさ（バイト）。cache はブラウザのデータ領域、folder は選んだフォルダー */
    async addonsSizeIn(where: 'cache' | 'folder'): Promise<number> {
      if (!addonsSupported()) return 0
      const cache = await caches.open(cacheName)
      let total = 0
      for (const a of ADDONS) {
        const m: AddonManifest | null =
          where === 'cache'
            ? await cache.match(manifestUrl(a.id)).then((r) => r?.json() ?? null)
            : await folder.read(a.id, 'manifest.json').then((f) => (f ? f.text().then(JSON.parse) : null), () => null)
        if (m) total += addonSize(m)
      }
      return total
    },
    /** 置き場所ごとに、導入済みの追加機能をすべて消す */
    async clearAddonsIn(where: 'cache' | 'folder') {
      if (where === 'cache') {
        if (addonsSupported()) await caches.delete(cacheName)
      } else await folder.clear()
      changed()
    },
    /** 導入済みの追加機能をすべて消す */
    async clearAddons() {
      if (addonsSupported()) await caches.delete(cacheName)
      await folder.clear()
      changed()
    },
    /** 導入済みの追加機能を読み込む。モジュールの形は追加機能ごとに決める */
    async loadAddon<T>(id: string): Promise<T> {
      const m = await installedManifest(id)
      if (!m?.entry) throw new Error(`${id} は導入されていないか、読み込むファイルがありません`)
      return import(/* @vite-ignore */ new URL(m.entry, baseUrl(id)).href)
    },
  }
}
