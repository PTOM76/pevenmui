// 名前を入れるダイアログ（名前の変更、プリセットの保存など。アプリで共通。題名はアプリが渡す）
import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useLabels } from '../labels'
import { pevenFont } from '../tokens'

/** 名前を入れる。`name` が null なら閉じている。開いたときは全体を選んでおき、そのまま打ち直せる */
export function RenameDialog(p: { name: string | null; title: string; onClose: () => void; onRename: (name: string) => void }) {
  const l = useLabels()
  const [value, setValue] = useState('')
  useEffect(() => {
    if (p.name !== null) setValue(p.name)
  }, [p.name])
  const ok = () => {
    if (value.trim()) p.onRename(value)
    p.onClose()
  }
  return (
    <Dialog open={p.name !== null} onClose={p.onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontSize: pevenFont('xl'), py: 1.5 }}>{p.title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ok()}
          onFocus={(e) => e.target.select()}
          slotProps={{ htmlInput: { 'aria-label': p.title } }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={p.onClose}>
          {l.cancel}
        </Button>
        <Button size="small" disabled={!value.trim()} onClick={ok}>
          {l.ok}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
