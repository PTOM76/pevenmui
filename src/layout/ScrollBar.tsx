// スクロールバー（横か縦）。全体の長さの中で、今見えている範囲をつまみで示し、つまみのドラッグと、溝を押しての移動ができる
import { useRef } from 'react'
import { Box } from '@mui/material'

interface Props {
  orientation: 'horizontal' | 'vertical'
  /** 全体の長さ（単位は何でもよい。start、size、onChange と同じ単位） */
  total: number
  /** 見えている範囲の始まり */
  start: number
  /** 見えている範囲の長さ */
  size: number
  /** つまみを動かして、始まりが変わった */
  onChange: (start: number) => void
  /** バーの太さ（px） */
  thickness?: number
}

/** 見えている範囲が全体に収まっていれば、つまみは出さない（溝だけ） */
export function ScrollBar({ orientation, total, start, size, onChange, thickness = 10 }: Props) {
  const horizontal = orientation === 'horizontal'
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointer: number; start: number } | null>(null)
  const scrollable = total > size && size > 0
  const frac = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`
  /** 溝の上の位置（px）を、全体の中の位置にする */
  const lengthPx = () => (horizontal ? track.current!.clientWidth : track.current!.clientHeight)
  const toUnits = (px: number) => (px / lengthPx()) * total
  const clamp = (v: number) => Math.max(0, Math.min(total - size, v))
  return (
    <Box
      ref={track}
      sx={{
        position: 'relative',
        flexShrink: 0,
        width: horizontal ? undefined : thickness,
        height: horizontal ? thickness : undefined,
        bgcolor: 'action.hover',
        touchAction: 'none',
        userSelect: 'none',
      }}
      // 溝を押したら、そこがつまみの真ん中になるように動かす
      onPointerDown={(e) => {
        if (!scrollable || e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        onChange(clamp(toUnits(horizontal ? e.clientX - r.left : e.clientY - r.top) - size / 2))
      }}
    >
      {scrollable && (
        <Box
          sx={{
            position: 'absolute',
            borderRadius: thickness / 2,
            bgcolor: 'text.disabled',
            '&:hover, &:active': { bgcolor: 'text.secondary' },
            ...(horizontal ? { top: 1, bottom: 1, left: frac(start), width: frac(size) } : { left: 1, right: 1, top: frac(start), height: frac(size) }),
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { pointer: horizontal ? e.clientX : e.clientY, start }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (d) onChange(clamp(d.start + toUnits((horizontal ? e.clientX : e.clientY) - d.pointer)))
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
      )}
    </Box>
  )
}
