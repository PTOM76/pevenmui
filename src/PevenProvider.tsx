import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, GlobalStyles, ThemeProvider, type ThemeOptions } from '@mui/material'
import { createPevenTheme, desktopStyles } from './theme'

/** PC とスマホの境目（MUI の md） */
export const DESKTOP_QUERY = '(min-width: 900px)'

/** 画面幅が PC か（テーマができる前でも使えるよう、useMediaQuery ではなく matchMedia で見る） */
export function useDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

/**
 * 画面幅に合わせて PC 用 / スマホ用のテーマを切り替えて当てる。
 * `desktopLook` を付けると、PC のときデスクトップアプリらしい見た目（desktopStyles）も当てる
 */
export function PevenProvider(p: { children: ReactNode; theme?: ThemeOptions; desktopLook?: boolean }) {
  const desktop = useDesktop()
  const theme = useMemo(() => createPevenTheme(desktop, p.theme), [desktop, p.theme])
  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      {p.desktopLook && desktop && <GlobalStyles styles={desktopStyles} />}
      {p.children}
    </ThemeProvider>
  )
}

/**
 * アプリとして、スマホでページ全体が拡大縮小されないようにする。
 * viewport の user-scalable=no を無視する iOS Safari では、ピンチ操作（gesture*）を打ち消す
 */
export function preventPageZoom() {
  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
  }
}
