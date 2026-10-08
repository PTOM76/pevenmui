import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { fill, useLabels } from '../labels'
import { pevenFont } from '../tokens'
import { useAddons } from './context'
import { cancelDownload, installAll, isDownloading, useDownload } from './downloads'
import { addonSize, type AddonManifest, type Addons } from './store'

export const mb = (bytes: number) => `${(bytes / 2 ** 20).toFixed(1)} MB`

interface State {
  id: string
  /** 導入するもの（依存を含む）。取得できるまでは null */
  manifests: AddonManifest[] | null
  /** `id` がすでに入っていて、新しい版に入れ替えるか（文言を「更新」にする） */
  updating: boolean
  downloading: boolean
  /** ダウンロード中に閉じた（ダウンロードは続け、終わったら resolve する） */
  hidden: boolean
  error: string | null
  resolve: (ok: boolean) => void
}

/** `ids` の導入に要るもののうち、未導入か配信中と版が違うもののマニフェストと、`id`（最初のもの）がすでに入っているか */
async function plan(addons: Addons, ids: string[], force: boolean): Promise<{ manifests: AddonManifest[]; updating: boolean }> {
  const id = ids[0]
  const manifests: AddonManifest[] = []
  let updating = false
  for (const a of new Set(ids.flatMap(addons.withRequires))) {
    const [installed, latest] = await Promise.all([addons.installedManifest(a), addons.fetchManifest(a)])
    if (a === id) updating = !!installed
    if (!installed || installed.version !== latest.version || (force && a === id)) manifests.push(latest)
  }
  return { manifests, updating }
}

/**
 * 追加機能の導入。`request(id)` で確認ダイアログを出し、導入できたら true を返す（依存するものも一緒に入れる）。
 * `ensure(id, also)` は依存を含めて導入済みならダイアログを出さずに true を返す（機能を使う直前に呼ぶ）。`also` は一緒に要るもの。
 * ダウンロード中に閉じても続き、終わったら resolve する。返す `dialog` を画面のどこかに置く
 */
export function useAddonInstall() {
  const l = useLabels()
  const { addons, nameOf } = useAddons()
  const [state, setState] = useState<State | null>(null)
  const download = useDownload()

  /** `force` なら `id` は版が同じでも入れ直す（設定の「導入」）。偽なら未導入か古いものだけ入れる */
  const request = (id: string, force = true, also: string[] = []) =>
    new Promise<boolean>((resolve) => {
      setState({ id, manifests: null, updating: false, downloading: false, hidden: false, error: null, resolve })
      plan(addons, [id, ...also], force).then(
        ({ manifests, updating }) => setState((s) => s && { ...s, manifests, updating }),
        (e) => setState((s) => s && { ...s, error: fill(l.addonUnavailable, { error: String(e) }) }),
      )
    })

  /**
   * 依存を含めて導入済みで、配信中と同じ版なら true。未導入か古い版があれば、導入・更新の確認ダイアログを出す。
   * オフラインで配信中の版が分からなければ、今ある版で使う
   */
  const ensure = async (id: string, also: string[] = []) => {
    const stale = await Promise.all(
      [...new Set([id, ...also].flatMap(addons.withRequires))].map(async (a) => {
        const installed = await addons.installedManifest(a)
        if (!installed) return true
        const latest = await addons.fetchManifest(a).catch(() => null)
        return !!latest && latest.version !== installed.version
      }),
    )
    return stale.some(Boolean) ? request(id, false, also) : true
  }

  const close = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  // 文言の主語: 入れ替えるものに `id` が含まれていればそれ、依存だけ（実行環境だけが古いなど）なら最初のもの
  const mainId = state?.manifests?.some((m) => m.id === state.id) ? state.id : (state?.manifests?.[0]?.id ?? state?.id ?? '')

  const run = async () => {
    if (!state?.manifests) return
    // ほかの追加機能を取得中なら、終わるまで待ってもらう
    if (isDownloading()) return setState({ ...state, error: l.addonBusy })
    const { resolve } = state
    setState({ ...state, downloading: true, error: null })
    try {
      const name = nameOf(mainId)
      await installAll(addons, state.manifests, name, fill(l.addonDownloadingTask, { name }))
      resolve(true)
      setState(null)
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        resolve(false)
        setState(null)
        return
      }
      // 閉じていても、失敗は見えるように出し直す
      setState((s) => s && { ...s, downloading: false, hidden: false, error: fill(l.addonFailed, { error: String(e) }) })
    }
  }
  const busy = !!state?.downloading
  const progress = download?.progress ?? 0
  const size = state?.manifests?.reduce((s, m) => s + addonSize(m), 0) ?? 0
  const extra = state?.manifests?.filter((m) => m.id !== mainId).map((m) => nameOf(m.id)) ?? []
  const hide = () => setState((s) => s && { ...s, hidden: true })
  const up = !!state?.updating

  const dialog = (
    <Dialog open={!!state && !state.hidden} onClose={() => (busy ? hide() : close(false))} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontSize: pevenFont('xl'), py: 1.5 }}>{up ? l.addonUpdateTitle : l.addonInstallTitle}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: pevenFont('lg') }}>{fill(up ? l.addonUpdateText : l.addonInstallText, { name: state ? nameOf(mainId) : '' })}</Typography>
        {extra.length > 0 && <Typography sx={{ fontSize: pevenFont('base'), mt: 1 }}>{fill(up ? l.addonUpdateWith : l.addonInstallWith, { names: extra.join(l.keyNameSep) })}</Typography>}
        <Typography sx={{ fontSize: pevenFont('base'), mt: 1 }}>{state?.manifests ? fill(l.addonDownloadSize, { size: mb(size) }) : !state?.error && l.addonChecking}</Typography>
        <Typography className="selectable" sx={{ fontSize: pevenFont('md'), color: 'text.secondary', mt: 1 }}>{l.addonInstallHelp}</Typography>
        {busy && (
          <>
            <LinearProgress variant="determinate" value={progress * 100} sx={{ mt: 2 }} />
            <Typography sx={{ fontSize: pevenFont('md'), mt: 0.5 }}>{fill(l.addonDownloading, { percent: String(Math.round(progress * 100)) })}</Typography>
            <Typography sx={{ fontSize: pevenFont('md'), color: 'text.secondary', mt: 0.5 }}>{l.addonBackground}</Typography>
          </>
        )}
        {state?.error && <Typography className="selectable" sx={{ fontSize: pevenFont('md'), color: 'error.main', mt: 1.5 }}>{state.error}</Typography>}
      </DialogContent>
      <DialogActions>
        {busy ? (
          <>
            <Button size="small" color="error" onClick={cancelDownload}>
              {l.jobCancel}
            </Button>
            <Button size="small" onClick={hide}>
              {l.close}
            </Button>
          </>
        ) : (
          <>
            <Button size="small" onClick={() => close(false)}>
              {l.cancel}
            </Button>
            <Button size="small" disabled={!state?.manifests} onClick={() => void run()}>
              {up ? l.addonUpdate : l.addonInstall}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )

  return { request, ensure, dialog }
}
