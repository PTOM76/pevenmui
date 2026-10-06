import type { ReactNode } from 'react'
import { Box, Button, DialogActions, DialogContent, Stack, Typography } from '@mui/material'
import { useLabels } from '../labels'
import { useApp } from '../appContext'
import { WindowDialog } from '../window/WindowDialog'

/** 「このアプリについて」: アイコン・アプリ名と、バージョン・作者などの表 */
/** このアプリについて。`name` を省略すると、PevenProvider に渡したアプリの名前 */
export function AboutDialog(p: { open: boolean; onClose: () => void; icon: ReactNode; name?: string; rows: [string, ReactNode][] }) {
  const app = useApp()
  const name = p.name ?? app?.name ?? ''
  const l = useLabels()
  return (
    <WindowDialog open={p.open} onClose={p.onClose} windowTitle={name} name="about" width={444} height={440} dialogProps={{ maxWidth: 'xs', fullWidth: true }}>
      <DialogContent>
        <Stack spacing={2} sx={{ alignItems: 'center', pt: 1 }}>
          {p.icon}
          <Typography variant="h6">{name}</Typography>
          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.75, m: 0, width: '100%' }}>
            {p.rows.map(([k, v]) => (
              <Box key={k} sx={{ display: 'contents' }}>
                <Typography component="dt" sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {k}
                </Typography>
                <Typography component="dd" sx={{ fontSize: 13, m: 0, wordBreak: 'break-all' }}>
                  {v}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={p.onClose}>{l.close}</Button>
      </DialogActions>
    </WindowDialog>
  )
}
