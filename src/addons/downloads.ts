import { useSyncExternalStore } from 'react'
import { startJob } from '../progress/jobs'
import { addonSize, type AddonManifest, type Addons } from './store'

/** 追加機能のダウンロード（裏で進める）。導入のダイアログを閉じても続き、進み具合はゲージに出す。同時に行うのは 1 つだけで、ほかは順に待つ */

export interface Download {
  /** 表示する名前 */
  label: string
  /** 0〜1 */
  progress: number
}

let current: (Download & { ctrl: AbortController }) | null = null
/** 順番待ちの数（実行中のものを含む） */
let pending = 0
/** 最後に足したものが終わると解決する（次のものはこれを待つ） */
let tail: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()
const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
let snapshot: Download | null = null
/** ダウンロード中か順番待ちの追加機能と、その導入が終わると解決するもの（同じものを重ねて取りに行かないため） */
const inFlight = new Map<string, Promise<void>>()
let inFlightIds: ReadonlySet<string> = new Set()
const changeInFlight = () => {
  inFlightIds = new Set(inFlight.keys())
  listeners.forEach((f) => f())
}
const update = (d: typeof current) => {
  current = d
  snapshot = d && { label: d.label, progress: d.progress }
  listeners.forEach((f) => f())
}

/** ダウンロード中のもの（なければ null） */
export const useDownload = () => useSyncExternalStore(subscribe, () => snapshot)

/** ダウンロード中か順番待ちの追加機能の id（設定の「導入」「削除」を押せなくするため） */
export const useDownloadingIds = () => useSyncExternalStore(subscribe, () => inFlightIds)

/** ダウンロード中か、順番待ちのものがあるか */
export const isDownloading = () => pending > 0

/** 今のダウンロードを止める（途中まで入れたものは消える） */
export const cancelDownload = () => current?.ctrl.abort()

const abortError = () => new DOMException('aborted', 'AbortError')

/**
 * `manifests` を順に導入する。ほかのダウンロード中なら、終わってから始める。`task` はゲージに出す文字。
 * すでにダウンロード中か順番待ちのものは取り直さず、その完了を待つ。
 * `signal` か cancelDownload で止めたら AbortError で失敗する。`onStart` は待ち終えて始めるときに呼ぶ
 */
export async function installAll(addons: Addons, manifests: AddonManifest[], label: string, task: string, signal?: AbortSignal, onStart?: () => void) {
  // ほかの画面から同じものを導入中なら、それを待つだけにする
  const others = manifests.filter((m) => inFlight.has(m.id)).map((m) => inFlight.get(m.id)!)
  manifests = manifests.filter((m) => !inFlight.has(m.id))
  if (!manifests.length) {
    onStart?.()
    await Promise.all(others)
    return
  }
  const ctrl = new AbortController()
  signal?.addEventListener('abort', () => ctrl.abort())
  const prev = tail
  let done!: () => void
  tail = new Promise((r) => (done = r))
  // 待つ側には成否を伝えない（失敗したら、待っていた側の確認で入っていないと分かる）
  const finished = tail
  for (const m of manifests) inFlight.set(m.id, finished)
  changeInFlight()
  pending++
  // 待っている間もゲージに出し、そこから止められるようにする
  const job = startJob('download', task, () => ctrl.abort())
  try {
    await prev
    if (ctrl.signal.aborted) throw abortError()
    onStart?.()
    update({ label, progress: 0, ctrl })
    // 全体の大きさに対する進捗にする
    const total = manifests.reduce((s, m) => s + addonSize(m), 0) || 1
    let before = 0
    for (const m of manifests) {
      await addons.install(
        m,
        (p) => {
          const progress = (before + p * addonSize(m)) / total
          if (current?.ctrl === ctrl) update({ ...current, progress })
          job.update(progress)
        },
        ctrl.signal,
      )
      before += addonSize(m)
    }
    await Promise.all(others)
    // 数十MBを取り直さずに済むよう、消されにくくする申請もしておく（断られても使える）
    void navigator.storage?.persist?.()
  } finally {
    job.end()
    if (current?.ctrl === ctrl) update(null)
    pending--
    for (const m of manifests) if (inFlight.get(m.id) === finished) inFlight.delete(m.id)
    changeInFlight()
    done()
  }
}
