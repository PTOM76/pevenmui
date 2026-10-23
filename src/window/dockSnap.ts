// 別の窓（ポップアップ）を、本体の窓の端に寄せて離したら、その端の欄に置く。窓の位置から置く端を決める純粋な関数と、窓の位置を見張る処理
import type { DockEdge } from './dock'

/** 画面の座標の長方形（窓の位置と大きさ） */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 本体の窓の、端から何割までを「端に寄せた」とみなすか */
export const SNAP_BAND = 0.15

/**
 * 別の窓 win の真ん中が、本体の窓 main の端に寄っていれば、その端。
 * 真ん中が本体の窓の外にあるとき（別の画面など、わざと離した所）は置かない。複数の端に寄っていれば、いちばん近い端
 */
export function snapEdge(win: Rect, main: Rect, band = SNAP_BAND): DockEdge | null {
  const cx = win.x + win.w / 2
  const cy = win.y + win.h / 2
  if (main.w <= 0 || main.h <= 0 || cx < main.x || cx > main.x + main.w || cy < main.y || cy > main.y + main.h) return null
  const dist: Record<DockEdge, number> = {
    left: (cx - main.x) / main.w,
    right: (main.x + main.w - cx) / main.w,
    top: (cy - main.y) / main.h,
    bottom: (main.y + main.h - cy) / main.h,
  }
  const [edge, d] = (Object.entries(dist) as [DockEdge, number][]).reduce((a, b) => (b[1] < a[1] ? b : a))
  return d < band ? edge : null
}

/** 窓の位置と大きさ（画面の座標） */
export const rectOf = (w: Window): Rect => ({ x: w.screenX, y: w.screenY, w: w.outerWidth, h: w.outerHeight })

/**
 * 別の窓 win を動かしているあいだ、位置を見張る。ブラウザには窓を動かした、離したというイベントがないので、
 * 位置を一定の間隔で読み、動かしているあいだは寄せた端を onGuide に知らせ、止まって少し経ったらその端を onDrop に渡す。
 * 大きさを変えたとき（左や上の端を引くと位置も変わる）は、動かしたとはみなさない。戻り値で見張りをやめる
 */
export function watchWindowSnap(win: Window, o: { onGuide: (edge: DockEdge | null) => void; onDrop: (edge: DockEdge) => void; intervalMs?: number; settleMs?: number }): () => void {
  const interval = o.intervalMs ?? 120
  const settle = o.settleMs ?? 500
  let last = rectOf(win)
  let moved = false
  let movedAt = 0
  const id = setInterval(() => {
    if (win.closed) return
    const r = rectOf(win)
    const resized = r.w !== last.w || r.h !== last.h
    const changed = !resized && (r.x !== last.x || r.y !== last.y)
    last = r
    const now = performance.now()
    if (changed) {
      moved = true
      movedAt = now
      o.onGuide(snapEdge(r, rectOf(window)))
      return
    }
    if (resized) {
      moved = false
      o.onGuide(null)
      return
    }
    if (moved && now - movedAt >= settle) {
      moved = false
      o.onGuide(null)
      const edge = snapEdge(r, rectOf(window))
      if (edge) o.onDrop(edge)
    }
  }, interval)
  return () => {
    clearInterval(id)
    o.onGuide(null)
  }
}
