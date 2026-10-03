import { Box, Button, DialogActions, DialogContent, Link, Stack, Typography } from '@mui/material'
import { useLabels } from '../labels'
import { WindowDialog } from '../window/WindowDialog'

/** 使っている部品・モデルの 1 つ */
export interface LicenseEntry {
  /** 名前（「React」など） */
  name: string
  /** ライセンス（「MIT」「LGPL-3.0」など） */
  license: string
  /** 配布元・ライセンス本文へのリンク */
  url?: string
  /** 何に使っているか、著作権者、クレジットなど */
  note?: string
}

/**
 * ライセンス情報: アプリと、使っている部品・モデルのライセンス・リンク・クレジットの一覧（メニューの「ヘルプ」から開く）。
 * `intro` はアプリ自身のライセンスなど、一覧の上に出す文。文字は選んでコピーできる
 */
export function LicensesDialog(p: { open: boolean; onClose: () => void; title: string; intro?: string; entries: LicenseEntry[] }) {
  const l = useLabels()
  return (
    <WindowDialog open={p.open} onClose={p.onClose} title={p.title} name="licenses" width={560} height={620} dialogProps={{ maxWidth: 'sm', fullWidth: true }}>
      <DialogContent dividers>
        <Stack spacing={1.5} className="selectable">
          {p.intro && <Typography sx={{ fontSize: 13 }}>{p.intro}</Typography>}
          {p.entries.map((e) => (
            <Box key={e.name}>
              <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {e.url ? (
                    <Link href={e.url} target="_blank" rel="noopener noreferrer" underline="hover">
                      {e.name}
                    </Link>
                  ) : (
                    e.name
                  )}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{e.license}</Typography>
              </Stack>
              {e.note && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{e.note}</Typography>}
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={p.onClose}>{l.close}</Button>
      </DialogActions>
    </WindowDialog>
  )
}
