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
  const refresh = async () => {
    setName((await folder.saved())?.name ?? null)
    setPermission(await folder.permission())
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
  const allow = () => void run(folder.requestPermission)
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
      <Button size="small" variant="outlined" onClick={choose} sx={{ flexShrink: 0 }}>
        {l.addonFolderChoose}
      </Button>
      {error && <Typography sx={{ width: '100%', color: 'error.main', fontSize: pevenFont('sm') }}>{error}</Typography>}
    </Box>
  )
}
