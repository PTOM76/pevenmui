// Vite のプラグイン（vite.config.ts から読み込む。Node でそのまま動くよう、相対の import は .ts を付ける）
import { execSync } from 'node:child_process'
import type { Plugin } from 'vite'
import { defineApp, type AppInfo } from './app.ts'

/** ビルドしたコミットの短いハッシュ（CI では GITHUB_SHA、手元では git から。取れなければ dev） */
function commitHash(cwd?: string): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

/**
 * アプリの定義をビルドに渡す。
 * - `__APP_VERSION__` と `__APP_COMMIT__`（「このアプリについて」の版）
 * - index.html の `%APP_NAME%`、`%APP_SHORT_NAME%`、`%APP_DESCRIPTION%`、`%APP_LANG%`、`%APP_LOCALE%`、`%SITE_URL%`
 * - version.json（更新の確認で「どの版が来たか」を表示する。オフライン用のキャッシュには入れない）
 */
export function pevenApp(info: AppInfo, o: { version: string; root?: string }): Plugin {
  const app = defineApp(info)
  const commit = commitHash(o.root)
  // OGP は絶対 URL が要る。CI から SITE_URL で指定する
  const site = (process.env.SITE_URL ?? app.site ?? '/').replace(/\/?$/, '/')
  const vars: Record<string, string> = {
    APP_NAME: app.name,
    APP_SHORT_NAME: app.shortName,
    APP_DESCRIPTION: app.description ?? '',
    APP_LANG: app.htmlLang,
    APP_LOCALE: app.ogLocale,
    SITE_URL: site,
  }
  return {
    name: 'pevenmui-app',
    config: () => ({ define: { __APP_VERSION__: JSON.stringify(o.version), __APP_COMMIT__: JSON.stringify(commit) } }),
    transformIndexHtml: (html) => html.replace(/%(APP_\w+|SITE_URL)%/g, (m, k: string) => vars[k] ?? m),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: o.version, commit }) })
    },
  }
}

/** PWA の manifest の名前と言語。`manifest: { ...pevenManifest(APP_INFO), icons: [...] }` のように広げて使う */
export function pevenManifest(info: AppInfo) {
  const app = defineApp(info)
  return { name: app.name, short_name: app.shortName, lang: app.htmlLang, ...(app.description ? { description: app.description } : {}) }
}

/**
 * 追加機能のファイルを保存先から返す workbox の経路（`workbox.runtimeCaching` に入れる。src/addons/store.ts）。
 * 保存先（Cache Storage）にあればそれ、なければ選んだフォルダー（試験的）、なければネットワーク。保存は導入の処理だけが行う
 * （CacheFirst だと取ったものを勝手に保存し、中断したファイルや更新確認のマニフェストが残る）。
 * workbox は関数を文字列にして sw.js に埋め込むので、アプリの値を埋めた文字列から作る
 */
export function pevenAddonsRoute(appId: string) {
  const cacheName = `${appId}-addons`
  const src = `async ({ request, url }) => {
    // ignoreVary: サーバーが付ける Vary（Origin / Accept-Encoding）で照合が外れないようにする
    const hit = await caches.match(request, { cacheName: ${JSON.stringify(cacheName)}, ignoreVary: true })
    if (hit) return hit
    // 導入の取得（?v=）や更新の確認（?t=）はネットワークから取る
    if (!url.search) {
      try {
        // アプリの IndexedDB（createIdb と同じ形。まだなければ同じく kv を作る）
        const dir = await new Promise((resolve) => {
          const open = indexedDB.open(${JSON.stringify(appId)}, 1)
          open.onupgradeneeded = () => open.result.createObjectStore('kv')
          open.onerror = () => resolve(null)
          open.onsuccess = () => {
            const req = open.result.transaction('kv').objectStore('kv').get('addonFolder')
            req.onsuccess = () => (resolve(req.result), open.result.close())
            req.onerror = () => (resolve(null), open.result.close())
          }
        })
        if (dir && (await dir.queryPermission({ mode: 'readwrite' })) === 'granted') {
          const rel = decodeURIComponent(url.pathname.slice(new URL(registration.scope).pathname.length + 'addons/'.length))
          const parts = rel.split('/')
          let h = await dir.getDirectoryHandle(${JSON.stringify(cacheName)})
          for (const p of parts.slice(0, -1)) h = await h.getDirectoryHandle(p)
          const file = await (await h.getFileHandle(parts[parts.length - 1])).getFile()
          const ext = rel.slice(rel.lastIndexOf('.') + 1)
          const types = { js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', json: 'application/json' }
          return new Response(file, { headers: { 'content-type': types[ext] ?? 'application/octet-stream' } })
        }
      } catch {
        // フォルダーになければネットワークから
      }
    }
    return fetch(request)
  }`
  return {
    // ページを開く操作は対象外（追加機能のファイルだけを保存先から返す）
    urlPattern: ({ url, request }: { url: URL; request: Request }) => url.pathname.includes('/addons/') && request.mode !== 'navigate',
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    handler: new Function(`return ${src}`)() as (o: { request: Request; url: URL }) => Promise<Response>,
  }
}

/** cross-origin isolation（SharedArrayBuffer、wasm のマルチスレッド）のためのヘッダー。credentialless はほかのサイトのものを Cookie なしで読める */
const ISOLATION_HEADERS = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' }

/** Service Worker に読み込ませるスクリプトの名前（`workbox.importScripts` に入れる） */
export const ISOLATION_SCRIPT = 'isolation.js'

/**
 * ページの応答に COOP/COEP を足す Service Worker のスクリプト。GitHub Pages はヘッダーを付けられないため。
 * workbox が返すページ（navigate）の応答を包むだけで、キャッシュや更新の動きは変えない。
 * Safari は credentialless に未対応で、isolation にならない（今までどおり 1 スレッド）
 */
// sw.js と同じ全体の範囲で動くので、名前がぶつからないよう { } で囲む
const isolationScript = `{
const h = ${JSON.stringify(ISOLATION_HEADERS)}
const add = (r) => {
  if (!r || r.status === 0 || r.type === 'opaqueredirect') return r
  const headers = new Headers(r.headers)
  for (const k in h) headers.set(k, h[k])
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers })
}
const respondWith = FetchEvent.prototype.respondWith
FetchEvent.prototype.respondWith = function (r) {
  return respondWith.call(this, this.request.mode === 'navigate' ? Promise.resolve(r).then(add) : r)
}
}
`

/**
 * cross-origin isolation にする。開発サーバーとプレビューはヘッダーを付け、ビルドでは Service Worker 用のスクリプトを出す
 * （`workbox: { importScripts: [ISOLATION_SCRIPT] }` と一緒に使う。初めて開いた回は Service Worker がまだ受け持たないので isolation にならない）
 */
export function pevenIsolation(): Plugin {
  return {
    name: 'pevenmui-isolation',
    config: () => ({ server: { headers: ISOLATION_HEADERS }, preview: { headers: ISOLATION_HEADERS } }),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: ISOLATION_SCRIPT, source: isolationScript })
    },
  }
}
