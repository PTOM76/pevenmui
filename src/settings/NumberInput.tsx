// 単位付きの小さな数値入力（確定時に範囲外の値は丸める。設定画面とインスペクタで使う）
import { InputBase, Stack, Typography } from '@mui/material'
import { useNumberDraft } from '../hooks/useNumberDraft'
import { pevenFont } from '../tokens'

/** 単位付きの小さな数値入力（確定時に範囲外の値は丸める） */
export function NumberInput(p: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string; width?: number; disabled?: boolean; ariaLabel?: string }) {
  const field = useNumberDraft(p.value, p.onChange, p.min, p.max)
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        width: p.width ?? 80,
        flexShrink: 0,
        height: 24,
        px: 0.75,
        border: 1,
        borderColor: 'divider',
        borderRadius: 0.5,
        bgcolor: 'background.default',
        opacity: p.disabled ? 0.5 : 1,
        '&:focus-within': { borderColor: 'primary.main' },
      }}
    >
      <InputBase
        type="number"
        {...field}
        disabled={p.disabled}
        inputProps={{ min: p.min, max: p.max, step: p.step, 'aria-label': p.ariaLabel }}
        sx={{
          flex: 1,
          fontSize: pevenFont('md'),
          '& input': { p: 0, textAlign: 'right', MozAppearance: 'textfield' },
          // 数値欄の上下の矢印（スピンボタン）は幅を取り、小数が見切れるため出さない
          '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
        }}
      />
      {p.unit && <Typography sx={{ fontSize: pevenFont('sm'), color: 'text.secondary', ml: 0.5 }}>{p.unit}</Typography>}
    </Stack>
  )
}
