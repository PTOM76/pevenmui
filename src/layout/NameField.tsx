// 名前の表示と入力（ステータスバーのプロジェクト名など）。押すと小さなパネルが開き、Enter か外を押すと決まる。TempoField と同じ形式
import { useState, type ReactNode } from 'react'
import { Popover, TextField } from '@mui/material'
import { StatusButton } from './StatusBar'
import { pevenFont } from '../tokens'

/** `children` が押す項目の表示。名前の変更は空でなければ `onRename` に渡す（Esc は取り消し） */
export function NameField(p: { name: string; title: string; hint?: string; children: ReactNode; onRename: (name: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState('')
  const commit = () => {
    if (value.trim() && value.trim() !== p.name) p.onRename(value.trim())
    setAnchor(null)
  }
  return (
    <>
      <StatusButton
        title={p.hint}
        onClick={(e) => {
          setValue(p.name)
          setAnchor(e.currentTarget)
        }}
      >
        {p.children}
      </StatusButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={commit}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <TextField
          autoFocus
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setAnchor(null)
          }}
          onFocus={(e) => e.target.select()}
          slotProps={{ htmlInput: { 'aria-label': p.title }, input: { sx: { fontSize: pevenFont('base') } } }}
          sx={{ m: 1.5, width: 260 }}
        />
      </Popover>
    </>
  )
}
