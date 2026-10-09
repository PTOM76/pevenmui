import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { fill, useLabels } from '../labels'
import { pevenFont } from '../tokens'
import { useAddons } from './context'

/** 追加機能の保存先のフォルダー（試験的）。選んだフォルダーの名前と、選ぶボタン、許可がなければ許可するボタン */
export function AddonFolderRow() {
  const l = useLabels()
  const { addons } = useAddons()
  const folder = addons.folder
  const [name, setName] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  // まだ Cache Storage にある追加機能の数（フォルダーへ移すボタンを出すか）と、移している間の進み具合
  const [cached, setCached] = useState(0)
  const [moving, setMoving] = useState<{ done: number; total: number } | null>(null)
  const [moved, setMoved] = useState<number | null>(null)
  const refresh = async () => {
    setName((await folder.saved())?.name ?? null)
    setPermission(await folder.permission())
    setCached((await addons.cachedIds()).length)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void refresh(), [])
  // 押したボタンの窓（設定を別の窓で開いているときは、その窓から選ぶ画面や許可の確認を出す）
  const winOf = (e: React.MouseEvent) => e.currentTarget.ownerDocument.defaultView ?? window
  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      if (await fn()) addons.notifyAddonsChanged()
    } catch (e) {
      setError(String(e))
    }
    await refresh()
  }
  const choose = (e: React.MouseEvent) => void run(() => folder.choose(winOf(e)))
  // ブラウザからはエクスプローラーを開けないので、ファイルを開く画面をこのフォルダーから始めて見せる
  const show = (e: React.MouseEvent) => void run(() => folder.show(winOf(e)).then(() => false))
  const allow = () => void run(folder.requestPermission)
  const move = () =>
    void run(async () => {
      setMoved(null)
      setMoving({ done: 0, total: cached })
      try {
        setMoved(await addons.moveToFolder((done, total) => setMoving({ done, total })))
      } finally {
        setMoving(null)
      }
      return true
    })
  return (
    <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, pl: 4 }}>
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: pevenFont('base') }} noWrap>
        {name ? fill(l.addonFolderCurrent, { name }) : l.addonFolderNone}
      </Typography>
      {name && permission !== 'granted' && (
        <Button size="small" variant="contained" onClick={allow}>
          {l.addonFolderAllow}
        </Button>
      )}
      <Button size="small" variant="outlined" onClick={choose} disabled={!!moving} sx={{ flexShrink: 0 }}>
        {l.addonFolderChoose}
      </Button>
      {name && permission === 'granted' && (
        <Button size="small" variant="outlined" onClick={show} sx={{ flexShrink: 0 }}>
          {l.addonFolderShow}
        </Button>
      )}
      {/* 導入済みのもの（ブラウザのデータ領域にあるもの）を、このフォルダーへ移す */}
      {name && permission === 'granted' && (cached > 0 || moving) && (
        <Button size="small" variant="outlined" onClick={move} disabled={!!moving} sx={{ flexShrink: 0 }}>
          {moving ? fill(l.addonFolderMoving, { done: String(moving.done), total: String(moving.total) }) : fill(l.addonFolderMove, { n: String(cached) })}
        </Button>
      )}
      {moved !== null && <Typography sx={{ width: '100%', fontSize: pevenFont('sm'), color: 'text.secondary' }}>{fill(l.addonFolderMoved, { n: String(moved) })}</Typography>}
      {error && <Typography sx={{ width: '100%', color: 'error.main', fontSize: pevenFont('sm') }}>{error}</Typography>}
    </Box>
  )
}
