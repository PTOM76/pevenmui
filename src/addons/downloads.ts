import { useSyncExternalStore } from 'react'
import { startJob } from '../progress/jobs'
import { addonSize, type AddonManifest, type Addons } from './store'

/** 追加機能のダウンロード（裏で進める）。導入のダイアログを閉じても続き、進み具合はゲージに出す。同時に行うのは 1 つだけ */

export interface Download {
  /** 表示する名前 */
  label: string
  /** 0〜1 */
  progress: number
}

let current: (Download & { ctrl: AbortController }) | null = null
const listeners = new Set<() => void>()
const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}
let snapshot: Download | null = null
const update = (d: typeof current) => {
  current = d
  snapshot = d && { label: d.label, progress: d.progress }
  listeners.forEach((f) => f())
}

/** ダウンロード中のもの（なければ null） */
export const useDownload = () => useSyncExternalStore(subscribe, () => snapshot)

export const isDownloading = () => !!current

/** ダウンロードを止める（途中まで入れたものは消える） */
export const cancelDownload = () => current?.ctrl.abort()

/** `manifests` を順に導入する。`task` はゲージに出す文字。止めたら AbortError で失敗する */
export async function installAll(addons: Addons, manifests: AddonManifest[], label: string, task: string) {
  if (current) throw new Error('another download is running')
  const ctrl = new AbortController()
  update({ label, progress: 0, ctrl })
  const job = startJob('download', task, () => ctrl.abort())
  // 全体の大きさに対する進捗にする
  const total = manifests.reduce((s, m) => s + addonSize(m), 0) || 1
  let before = 0
  try {
    for (const m of manifests) {
      await addons.install(
        m,
        (p) => {
          const progress = (before + p * addonSize(m)) / total
          if (current) update({ ...current, progress })
          job.update(progress)
        },
        ctrl.signal,
      )
      before += addonSize(m)
    }
    // 数十MBを取り直さずに済むよう、消されにくくする申請もしておく（断られても使える）
    void navigator.storage?.persist?.()
  } finally {
    job.end()
    update(null)
  }
}
