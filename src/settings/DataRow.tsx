// 設定の「データ」の 1 行（名前と説明、右にボタン）と、消すボタン、見出し、使用量の表示（アプリで共通。文字はアプリが訳して渡す）
import type { ReactNode } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { pevenFont } from '../tokens'
import { useHighlighter } from './search'

/** 1 行。名前と説明（検索で光る）と、右にボタン */
export function DataRow(p: { label: string; help: string; children: ReactNode }) {
  const hit = useHighlighter()
  return (
    <Box sx={{ gridColumn: '1 / -1', width: 0, minWidth: '100%', display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: pevenFont('base'), ...hit(p.label, p.help) }}>{p.label}</Typography>
        <Typography className="selectable" sx={{ fontSize: pevenFont('sm'), color: 'text.secondary' }}>
          {p.help}
        </Typography>
      </Box>
      {p.children}
    </Box>
  )
}

/** 消すなど、元に戻せない操作のボタン（赤い枠） */
export function DangerButton(p: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="small" variant="outlined" color="error" disabled={p.disabled} onClick={p.onClick} sx={{ flexShrink: 0 }}>
      {p.label}
    </Button>
  )
}

/** 行のまとまりの見出し */
export const DataHeading = ({ children }: { children: ReactNode }) => <Typography sx={{ gridColumn: '1 / -1', fontSize: pevenFont('base'), fontWeight: 600, mt: 1 }}>{children}</Typography>

/** 1 行の文（使用量、終わったことの知らせ）。`note` は小さな補足、`done` は終わった知らせの色 */
export const DataText = ({ children, note, done }: { children: ReactNode; note?: boolean; done?: boolean }) => (
  <Typography
    className={note || done ? 'selectable' : undefined}
    sx={{ gridColumn: '1 / -1', fontSize: pevenFont(note ? 'sm' : done ? 'md' : 'base'), color: note ? 'text.secondary' : done ? 'primary.main' : undefined, mt: note ? -1 : 0 }}
  >
    {children}
  </Typography>
)
