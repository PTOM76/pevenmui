import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useConfirm } from '../dialog/ConfirmDialog'
import { fill, useLabels } from '../labels'
import { useHighlighter } from '../settings/search'
import { pevenFont } from '../tokens'
import { mb, useAddonInstall } from './AddonInstallDialog'
import { useAddons } from './context'
import { useDownloadingIds } from './downloads'
import { addonSize, addonsSupported, type AddonManifest } from './store'

interface Status {
  installed: AddonManifest | null
  /** 配信中のもの（オフラインなどで取れなければ null） */
  latest: AddonManifest | null
}

/** 追加機能 `ids` の一覧と、導入・更新・削除（設定の Group の中に置く） */
export function AddonSection({ ids }: { ids: string[] }) {
  const l = useLabels()
  const { addons, nameOf } = useAddons()
  const { request, dialog } = useAddonInstall()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const hit = useHighlighter()
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [message, setMessage] = useState<string | null>(null)
  const list = addons.ADDONS.filter((a) => ids.includes(a.id))
  // ほかの画面で導入中のものは、導入も削除も押せなくする（終わったら表示を取り直す）
  const busyIds = useDownloadingIds()
  const busyKey = list.filter((a) => busyIds.has(a.id)).map((a) => a.id).join()

  const refresh = () => {
    for (const a of list) {
      void Promise.all([addons.installedManifest(a.id), addons.fetchManifest(a.id).catch(() => null)]).then(([installed, latest]) =>
        setStatus((s) => ({ ...s, [a.id]: { installed, latest } })),
      )
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [ids.join(), busyKey])

  if (!addonsSupported()) return <Typography sx={{ gridColumn: '1 / -1', fontSize: pevenFont('base') }}>{l.addonUnsupported}</Typography>

  const describe = (s: Status | undefined) => {
    if (!s) return l.addonChecking
    // 配信中のマニフェストが取れないと導入できない（オフライン、または追加機能を置いていない開発サーバーなど）
    if (!s.installed) return s.latest ? fill(l.addonNotInstalledSize, { size: mb(addonSize(s.latest)) }) : l.addonNotAvailable
    const info = fill(l.addonInstalledInfo, { version: s.installed.version, size: mb(addonSize(s.installed)) })
    return s.latest && s.latest.version !== s.installed.version ? `${info} / ${fill(l.addonUpdateAvailable, { version: s.latest.version })}` : info
  }

  const install = async (id: string) => {
    if (await request(id)) setMessage(l.addonInstalled)
    refresh()
  }
  const remove = async (id: string) => {
    if (!(await confirm({ message: fill(l.addonDeleteConfirm, { name: nameOf(id) }), okLabel: l.addonDelete, danger: true }))) return
    // 依存していた実行環境なども、使われなくなったら一緒に消す
    await addons.uninstallWithUnused(id)
    setMessage(l.addonDeleted)
    refresh()
  }

  return (
    <>
      {list.map((a) => {
        const s = status[a.id]
        const updatable = !!(s?.installed && s.latest && s.latest.version !== s.installed.version)
        const name = nameOf(a.id, true)
        const busy = busyIds.has(a.id)
        // 中身の文字の長さで幅が変わらないよう、まとまり（Group）の枠の幅いっぱいにそろえる（cqi は枠の幅）
        return (
          <Box key={a.id} sx={{ gridColumn: '1 / -1', width: '100cqi', maxWidth: '100cqi', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: pevenFont('base'), ...hit(name) }}>{name}</Typography>
              <Typography className="selectable" sx={{ fontSize: pevenFont('sm'), color: 'text.secondary' }}>{busy ? l.addonInFlight : describe(s)}</Typography>
            </Box>
            {(!s?.installed || updatable) && (
              <Button size="small" variant="outlined" disabled={!s?.latest || busy} onClick={() => void install(a.id)} sx={{ flexShrink: 0 }}>
                {updatable ? l.addonUpdate : l.addonInstall}
              </Button>
            )}
            {s?.installed && (
              <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => void remove(a.id)} sx={{ flexShrink: 0 }}>
                {l.addonDelete}
              </Button>
            )}
          </Box>
        )
      })}
      {message && <Typography className="selectable" sx={{ gridColumn: '1 / -1', fontSize: pevenFont('md'), color: 'primary.main' }}>{message}</Typography>}
      {dialog}
      {confirmDialog}
    </>
  )
}
