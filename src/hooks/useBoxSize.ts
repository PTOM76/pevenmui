// 要素の大きさ（幅と高さ）。大きさが変わった同じフレームのうちに更新するので、canvas を描き直しても一瞬消えない
import { useLayoutEffect, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

/**
 * ref の要素の大きさ（px、切り捨て）。ResizeObserver の中で flushSync するので、画面に出る前に描き直せる
 * （canvas は大きさを変えると中身が消える。描画が遅れると一瞬ちらつく）。使う側の描画は useLayoutEffect に置く
 */
export function useBoxSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // 大きさが実際に変わったときだけ更新する（同じ値でも新しいオブジェクトを渡すと描き直しが走るため）
    const ro = new ResizeObserver(([e]) => {
      const width = Math.floor(e.contentRect.width)
      const height = Math.floor(e.contentRect.height)
      flushSync(() => setSize((s) => (s.width === width && s.height === height ? s : { width, height })))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}
