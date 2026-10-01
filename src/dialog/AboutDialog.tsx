import type { ReactNode } from 'react'
import { Box, Button, DialogActions, DialogContent, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material'
import { useLabels } from '../labels'
import { WindowDialog } from '../window/WindowDialog'

/** 「このアプリについて」: アイコン・アプリ名と、バージョン・作者などの表 */
export function AboutDialog(p: { open: boolean; onClose: () => void; icon: ReactNode; name: string; rows: [string, ReactNode][] }) {
  const l = useLabels()
  return (
    <WindowDialog open={p.open} onClose={p.onClose} windowTitle={p.name} name="about" width={444} height={440} dialogProps={{ maxWidth: 'xs', fullWidth: true }}>
      <DialogContent>
        <Stack spacing={2} sx={{ alignItems: 'center', pt: 1 }}>
          {p.icon}
          <Typography variant="h6">{p.name}</Typography>
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

/** キーボード・マウス操作の一覧。`rows` は [キー, 説明] */
export function ShortcutsDialog(p: { open: boolean; onClose: () => void; title: string; rows: [string, string][] }) {
  return (
    <WindowDialog open={p.open} onClose={p.onClose} title={p.title} name="shortcuts" width={600} height={560}>
      <DialogContent>
        <Table size="small">
          <TableBody>
            {p.rows.map(([key, desc]) => (
              <TableRow key={key}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{key}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </WindowDialog>
  )
}
