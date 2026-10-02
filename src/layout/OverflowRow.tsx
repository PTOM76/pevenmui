import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Box, IconButton, Paper, Popover, Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { useLabels } from '../labels'

/** ▼ ボタンの幅（px）。入りきるかを決めるときに、この分を空けておく */
const MORE_W = 32

/**
 * 横に並べた部品のうち、入りきらない後ろのほうを隠し、▼ ボタンで開く小さな窓に出す（ツールバーのはみ出し対策）。
 * 中身（`children`）は並べたまま描いて DOM の子の幅を測る。どの部品の並びでも使えるよう、隠すのは CSS（nth-child）で行い、
 * 窓には同じ中身をもう一度描いて、見えている分を隠す（中身は状態を持たない部品にすること）
 */
export function OverflowRow({ children }: { children: ReactNode }) {
  const l = useLabels()
  const rowRef = useRef<HTMLDivElement>(null)
  /** 子ごとの幅（隠すと 0 になるので、見えていたときの幅を覚えておく） */
  const widths = useRef<number[]>([])
  /** 見せる子の数（null は全部） */
  const [shown, setShown] = useState<number | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const measure = useCallback(() => {
    const row = rowRef.current
    if (!row) return
    const kids = Array.from(row.children) as HTMLElement[]
    kids.forEach((el, i) => {
      if (el.offsetWidth) widths.current[i] = el.offsetWidth
    })
    widths.current.length = kids.length
    const total = widths.current.reduce((a, b) => a + (b ?? 0), 0)
    if (total <= row.clientWidth) return setShown(null)
    // ▼ ボタンの分を空けて、前から入るだけ見せる
    const room = row.clientWidth - MORE_W
    let sum = 0
    let n = 0
    for (const w of widths.current) {
      if (sum + (w ?? 0) > room) break
      sum += w ?? 0
      n++
    }
    setShown(n)
  }, [])

  // 中身が変わったら測り直す（同じ値なら描き直しにはならない）
  useLayoutEffect(measure)
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [measure])

  const hiding = shown !== null
  // 見せない子（n+1 番目から後ろ）を隠す
  // （nth-of-type は要素の種類ごとに数えるので使わない。子は span・hr・button などが混ざる）
  const hideAfter = hiding ? { [`& > :nth-child(n+${shown + 1})`]: { display: 'none' } } : {}
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', alignSelf: 'stretch' }}>
      <Box ref={rowRef} sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', alignSelf: 'stretch', overflow: 'hidden', ...hideAfter, '& > *': { flexShrink: 0 } }}>
        {children}
      </Box>
      {hiding && (
        <>
          <Tooltip title={l.more}>
            <IconButton size="small" aria-label={l.more} aria-haspopup="true" aria-expanded={!!anchor} onClick={(e) => setAnchor(e.currentTarget)} sx={{ width: MORE_W - 4 }}>
              <FontAwesomeIcon icon={faCaretDown} />
            </IconButton>
          </Tooltip>
          <Popover
            open={!!anchor}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {/* 同じ中身を描き、ツールバーに見えている分（前から shown 個）を隠す。押したら閉じる */}
            <Paper
              onClick={() => setAnchor(null)}
              sx={{
                p: 0.5,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                maxWidth: 360,
                minHeight: 40,
                [`& > :nth-child(-n+${shown})`]: { display: 'none' },
                '& > *': { flexShrink: 0 },
              }}
            >
              {children}
            </Paper>
          </Popover>
        </>
      )}
    </Box>
  )
}
