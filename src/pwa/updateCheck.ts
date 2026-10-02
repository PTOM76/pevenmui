/**
 * 新しい版の確認。Service Worker の登録（UpdatePrompt で行う）を覚えておき、
 * 設定画面の「今すぐ確認」（UpdateSection）からも確認できるようにする。
 * 配信中の版は、ビルド時に書いた `version.json`（{ version, commit }）から読む
 */

let registration: ServiceWorkerRegistration | null = null
/** 待っている新しい版に入れ替えて読み込み直す（UpdatePrompt が useRegisterSW から渡す） */
let applyUpdate: (() => void) | null = null
/** 今動いている版（UpdatePrompt が受け取る） */
let appBuild = ''

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

/** UpdatePrompt が、新しい版に入れ替える関数を渡す */
export function setApplyUpdate(fn: () => void) {
  applyUpdate = fn
}

/** 入れ替えを待つ最長時間（ミリ秒）。過ぎたらそのまま読み込み直す */
const SWAP_TIMEOUT_MS = 5000

/** 入れ替え中の Service Worker が、インストールを終えるまで待つ */
function installed(sw: ServiceWorker | null): Promise<ServiceWorker | null> {
  if (!sw || sw.state !== 'installing') return Promise.resolve(sw)
  return new Promise((resolve) => {
    const done = () => sw.state !== 'installing' && (sw.removeEventListener('statechange', done), resolve(sw.state === 'redundant' ? null : sw))
    sw.addEventListener('statechange', done)
  })
}

/**
 * 待っている新しい版に入れ替えて読み込み直す（設定の「更新」から呼ぶ）。
 * 確認した直後はまだダウンロード中のことがあるので、インストールが終わるのを待ってから入れ替える
 */
export async function updateNow() {
  const r = registration
  const sw = r ? (r.waiting ?? (await installed(r.installing))) : null
  if (!sw) {
    // 入れ替えるものが無ければ、UpdatePrompt の方法に任せる（開発サーバーなど）
    applyUpdate?.()
    return
  }
  let reloaded = false
  const reload = () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
  setTimeout(reload, SWAP_TIMEOUT_MS)
  sw.postMessage({ type: 'SKIP_WAITING' })
}

/** 確認の結果。found なら `build` に配信中の版（取れなければ null）を入れる */
export type UpdateCheckResult = { kind: 'found'; build: string | null } | { kind: 'latest' | 'unsupported' | 'failed' }

/** 今すぐ新しい版を確認する */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  // 開発サーバーや、Service Worker が使えないブラウザでは確認できない
  if (!registration) return { kind: 'unsupported' }
  try {
    await registration.update()
  } catch {
    return { kind: 'failed' }
  }
  if (!registration.installing && !registration.waiting) return { kind: 'latest' }
  // ダウンロード中なら終わるまで待つ（終わる前に「更新」を押しても入れ替えられないため）
  if (!registration.waiting && !(await installed(registration.installing))) return { kind: 'failed' }
  // Service Worker が待っていても、配信中の版が今の版と同じなら最新（UpdatePrompt と同じ判定）
  const build = await fetchLatestBuild()
  return build === appBuild ? { kind: 'latest' } : { kind: 'found', build }
}
