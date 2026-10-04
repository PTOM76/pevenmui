/**
 * 画面の大きさ（文字・入力欄・ボタンなどをまとめて拡大縮小する）。ページ全体に CSS の zoom をかける。
 * 部品の文字の大きさは各所で直接決めているので、テーマの文字の大きさではなく zoom で一律に変える。
 * Canvas は、拡大してもぼやけないよう、``canvasPixelRatio()``（devicePixelRatio × 倍率）で解像度を決める
 */

let scale = 1

/** 画面の大きさを `s` 倍にする（1 で元に戻す） */
export function setUiScale(s: number) {
  scale = s > 0 ? s : 1
  if (typeof document === 'undefined') return
  const root = document.documentElement.style
  if (scale === 1) root.removeProperty('zoom')
  else root.setProperty('zoom', String(scale))
  root.setProperty('--ui-scale', String(scale))
}

/** 画面の高さいっぱい（zoom をかけると 100dvh も拡大されてはみ出すので、倍率で割る） */
export const FULL_HEIGHT = 'calc(100dvh / var(--ui-scale, 1))'

/** 今の画面の大きさ（倍率） */
export const getUiScale = () => scale

/** 要素の左上からの位置（要素の CSS ピクセル。zoom の有無やブラウザの違いを、表示の大きさとの比で吸収する） */
export function localPoint(el: HTMLElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect()
  const sx = el.offsetWidth ? el.offsetWidth / r.width : 1
  const sy = el.offsetHeight ? el.offsetHeight / r.height : 1
  return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy }
}

/** Canvas の 1 CSS ピクセルあたりの画素数（devicePixelRatio × 画面の大きさ） */
export const canvasPixelRatio = () => (typeof window === 'undefined' ? 1 : (window.devicePixelRatio || 1) * scale)
