// 名前、細いスライダー、数値の入力の 1 行（ダイアログやインスペクタの数値。アプリで共通）
import { Box, Slider, Typography } from '@mui/material'
import { pevenFont } from '../tokens'
import { useDoubleClickReset } from './sliderReset'
import { NumberInput } from './NumberInput'

/** インスペクタ用の細いスライダーの見た目（目盛りの数字は出さず、行の高さに収める） */
export const COMPACT_SLIDER_SX = {
  flex: 1,
  py: '10px !important',
  '& .MuiSlider-thumb': { width: 12, height: 12 },
  '& .MuiSlider-rail, & .MuiSlider-track': { height: 3 },
} as const

/** 名前、スライダー、数値欄の 1 行。log なら位置を対数にする（周波数など。min は 0 より大きい）。defaultValue があればダブルクリックでそこに戻す */
export function SliderRow(p: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string; log?: boolean; defaultValue?: number }) {
  const reset = useDoubleClickReset(() => p.defaultValue !== undefined && p.onChange(p.defaultValue))
  const span = Math.log(p.max / p.min)
  const toPos = (v: number) => (p.log ? Math.log(Math.max(v, p.min) / p.min) / span : v)
  const fromPos = (x: number) => (p.log ? p.min * Math.exp(x * span) : x)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography sx={{ fontSize: pevenFont('base'), width: 72, flexShrink: 0 }}>{p.label}</Typography>
      <Slider
        aria-label={p.label}
        value={toPos(p.value)}
        min={p.log ? 0 : p.min}
        max={p.log ? 1 : p.max}
        step={p.log ? 0.001 : p.step}
        onChange={(_, v) => p.onChange(p.log ? Math.round(fromPos(v as number) / p.step) * p.step : (v as number))}
        {...(p.defaultValue !== undefined ? reset : {})}
        sx={COMPACT_SLIDER_SX}
      />
      <NumberInput value={p.value} onChange={p.onChange} min={p.min} max={p.max} step={p.step} unit={p.unit} ariaLabel={p.label} />
    </Box>
  )
}
