import type { ReactNode } from 'react'
import { Box, Paper } from '@mui/material'
import { JobGauge } from '../progress/JobGauge'
import { useJobs } from '../progress/jobs'

/**
 * スマホ用: 画面下のバーの枠（親指で押しやすい位置）。画面の縦の並びの最後に置く。
 * 進んでいる処理があれば上に表示する（スマホにはステータスバーが無いため）。中のボタンはアプリが渡す
 */
export function BottomBar<K extends string>({ children, kindLabel }: { children: ReactNode; kindLabel: (kind: K) => string }) {
  const busy = useJobs().length > 0
  return (
    <Paper square elevation={0} sx={{ pb: 'env(safe-area-inset-bottom)', borderTop: 1, borderColor: 'divider' }}>
      {busy && (
        <Box sx={{ px: 1.5, pt: 0.75 }}>
          <JobGauge<K> compact kindLabel={kindLabel} />
        </Box>
      )}
      {children}
    </Paper>
  )
}
