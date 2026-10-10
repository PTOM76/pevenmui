// ウィンドウの数が上限のときの画面（作業を開かない。アプリで共通。文字はアプリが訳して渡す）
import { Button, Stack, Typography } from '@mui/material'
import { FULL_HEIGHT } from '../uiScale'

/** ウィンドウの数が上限のときに、作業の画面の代わりに出す（web/windowSlot.ts）。開き直すか閉じる */
export function WindowLimitScreen(p: { message: string; hint: string; retry: string; close: string }) {
  return (
    <Stack spacing={2} sx={{ height: FULL_HEIGHT, alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default', textAlign: 'center' }}>
      <Typography>{p.message}</Typography>
      <Typography variant="caption" color="text.secondary">
        {p.hint}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={() => location.reload()}>
          {p.retry}
        </Button>
        <Button onClick={() => window.close()}>{p.close}</Button>
      </Stack>
    </Stack>
  )
}
