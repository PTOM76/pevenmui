/**
 * 新しい版の確認。Service Worker の登録（UpdatePrompt で行う）を覚えておき、
 * 設定画面の「今すぐ確認」（UpdateSection）やメニューからも確認・更新できるようにする。
 * 配信中の版は、ビルド時に書いた `version.json`（{ version, commit }）から読む
 */

let registration: ServiceWorkerRegistration | null = null
/** 今動いている版（UpdatePrompt が受け取る） */
let appBuild = ''
/** 「新しい版があります」の通知を出す（UpdatePrompt が渡す。引数は配信中の版） */
let showPrompt: ((build: string | null) => void) | null = null

/** バージョンとコミットを、表示する形にする（例: 1.0.3 (47a7e39)） */
export const formatBuild = (version: string, commit: string) => `${version} (${commit})`

/** 配信中の版（ビルド時に書いた version.json）。取れなければ null（オフラインなど） */
export async function fetchLatestBuild(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const v = (await res.json()) as { version: string; commit: string }
    return formatBuild(v.version, v.commit)
  } catch {
    return null
  }
}

export const getAppBuild = () => appBuild

/** 今動いている版を覚える（UpdatePrompt が描くときに呼ぶ。Service Worker が無い開発サーバーでも表示できるように） */
export function setAppBuild(build: string) {
  appBuild = build
}

/** UpdatePrompt が Service Worker を登録したときに呼ぶ */
export function setRegistration(r: ServiceWorkerRegistration) {
  registration = r
}

/** UpdatePrompt が、通知を出す関数を渡す */
export function setShowPrompt(fn: (build: string | null) => void) {
  showPrompt = fn
}

/** 「新しい版があります」の通知を出す（メニューの「更新を確認」で見つけたとき） */
export function promptUpdate(build: string | null) {
  showPrompt?.(build)
}

/** 入れ替えを待つ最長時間（ミリ秒）。過ぎたらそのまま読み込み直す */
const SWAP_TIMEOUT_MS = 5000
/** 新しい版がまだ届いていないときに取り直す回数と間隔（配信先のキャッシュで、版の番号だけ先に新しくなることがある） */
const FETCH_TRIES = 6
const FETCH_INTERVAL_MS = 5000

/** 入れ替え中の Service Worker が、インストールを終えるまで待つ */
function installed(sw: ServiceWorker | null): Promise<ServiceWorker | null> {
  if (!sw || sw.state !== 'installing') return Promise.resolve(sw)
  return new Promise((resolve) => {
    const done = () => sw.state !== 'installing' && (sw.removeEventListener('statechange', done), resolve(sw.state === 'redundant' ? null : sw))
    sw.addEventListener('statechange', done)
  })
}

/** 待っている新しい版。無ければ取りに行き、届くまで何回か取り直す */
async function fetchWaiting(r: ServiceWorkerRegistration): Promise<ServiceWorker | null> {
  for (let i = 0; i < FETCH_TRIES; i++) {
    const sw = r.waiting ?? (await installed(r.installing))
    if (sw) return sw
    if (i > 0) await new Promise((res) => setTimeout(res, FETCH_INTERVAL_MS))
    await r.update().catch(() => {})
  }
  return r.waiting ?? (await installed(r.installing))
}

/**
 * 新しい版をダウンロードし、入れ替えて読み込み直す（設定・通知の「更新」から呼ぶ）。
 * 入れ替えられなかったら false（新しい版がまだ配信されていない、など）
 */
export async function updateNow(): Promise<boolean> {
  const r = registration
  if (!r) return false
  const sw = await fetchWaiting(r)
  if (!sw) return false
  let reloaded = false
  const reload = () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
  setTimeout(reload, SWAP_TIMEOUT_MS)
  sw.postMessage({ type: 'SKIP_WAITING' })
  return true
}

/** 確認の結果。found なら `build` に配信中の版（取れなければ null）を入れる */
export type UpdateCheckResult = { kind: 'found'; build: string | null } | { kind: 'latest' | 'unsupported' | 'failed' }

/** 今すぐ新しい版を確認する。配信中の版（version.json）と比べるだけで、ダウンロードは「更新」で行う */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  // 開発サーバーや、Service Worker が使えないブラウザでは更新できない
  if (!registration) return { kind: 'unsupported' }
  const build = await fetchLatestBuild()
  if (build === null) return { kind: 'failed' }
  return build === appBuild ? { kind: 'latest' } : { kind: 'found', build }
}
