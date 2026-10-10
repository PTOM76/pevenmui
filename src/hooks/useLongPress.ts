// タッチの長押しとダブルタップ（iPhone と iPad は長押しで contextmenu、ダブルタップで dblclick が来ないため、自分で見分ける）
import { useRef } from 'react'

/** 長押しとみなす時間（ミリ秒）と、指がこれ以上動いたら取り消す距離（px） */
export const LONG_PRESS_MS = 500
export const LONG_PRESS_SLOP_PX = 8
/** ダブルタップとみなす、2 回のタップの間の時間（ミリ秒）と距離（px） */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_PX = 24

/**
 * 長押しを見分ける。`start` で指を置いた位置と、長押しになったときの処理を渡し、`move` で指の動きを渡す（動きすぎたら取り消す）。
 * 指を離したら `cancel` を呼ぶ。`active` は長押しを待っている間だけ真
 */
export function useLongPress(ms = LONG_PRESS_MS, slop = LONG_PRESS_SLOP_PX) {
  const ref = useRef<{ timer: number; x: number; y: number } | null>(null)
  const cancel = () => {
    if (ref.current) clearTimeout(ref.current.timer)
    ref.current = null
  }
  return {
    start: (x: number, y: number, fire: () => void) => {
      cancel()
      const timer = window.setTimeout(() => {
        ref.current = null
        fire()
      }, ms)
      ref.current = { timer, x, y }
    },
    move: (x: number, y: number) => {
      const p = ref.current
      if (p && Math.hypot(x - p.x, y - p.y) > slop) cancel()
    },
    cancel,
    active: () => ref.current !== null,
  }
}

/** ダブルタップを見分ける。指を離したときに `tap` を呼び、前のタップに近ければ真を返す */
export function useDoubleTap() {
  const last = useRef<{ t: number; x: number; y: number } | null>(null)
  return {
    tap: (x: number, y: number) => {
      const now = performance.now()
      const p = last.current
      const hit = !!p && now - p.t < DOUBLE_TAP_MS && Math.hypot(x - p.x, y - p.y) < DOUBLE_TAP_PX
      last.current = hit ? null : { t: now, x, y }
      return hit
    },
  }
}
