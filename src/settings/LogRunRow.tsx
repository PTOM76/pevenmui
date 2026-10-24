// 設定画面の、押すと調べて結果を 1 行ずつ出す行（診断など。結果は選んでコピーできる）
import { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { pevenFont } from '../tokens'

/** 説明とボタンの行。押すと `run` を行い、`log` に渡された行を下に並べる（失敗したらその内容も出す） */
export function LogRunRow(p: { label: string; help?: string; runLabel: string; runningLabel: string; run: (log: (line: string) => void) => Promise<void> }) {
  const [lines, setLines] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const run = async () => {
    setRunning(true)
    setLines([])
    try {
      await p.run((line) => setLines((l) => [...l, line]))
    } catch (e) {
      setLines((l) => [...l, String(e)])
    } finally {
      setRunning(false)
    }
  }
  return (
    // 幅を設定の表の列幅の計算に入れない（長い説明やログでラベル列が広がる）
    <Box sx={{ gridColumn: '1 / -1', contain: 'inline-size', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: pevenFont('base') }}>{p.label}</Typography>
          {p.help && <Typography sx={{ fontSize: pevenFont('sm'), color: 'text.secondary' }}>{p.help}</Typography>}
        </Box>
        <Button size="small" variant="outlined" disabled={running} onClick={() => void run()}>
          {running ? p.runningLabel : p.runLabel}
        </Button>
      </Box>
      {lines.length > 0 && (
        <Box className="selectable" sx={{ font: '11px/1.5 ui-monospace, Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', p: 1, borderRadius: 1, bgcolor: 'action.hover', userSelect: 'text' }}>
          {lines.join('\n')}
        </Box>
      )}
    </Box>
  )
}
