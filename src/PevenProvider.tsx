import { useEffect, useMemo, useState, type Context, type ReactNode } from 'react'
import { CssBaseline, GlobalStyles, ThemeProvider, type ThemeOptions } from '@mui/material'
import { createPevenTheme, desktopStyles } from './theme'
import type { I18n } from './i18n'
import { PevenLabels } from './labels'

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
 * `desktopLook` を付けると、PC のときデスクトップアプリらしい見た目（desktopStyles）も当てる。
 * `i18n` と `lang` を渡すと、アプリの文字と部品の文字をその言語に切り替える
 */
export function PevenProvider<L extends string>(p: { children: ReactNode; theme?: ThemeOptions; desktopLook?: boolean; i18n?: Pick<I18n, 'setLang' | 'labels'> & { LangContext: Context<L> }; lang?: L }) {
  const desktop = useDesktop()
  const theme = useMemo(() => createPevenTheme(desktop, p.theme), [desktop, p.theme])
  let children = p.children
  if (p.i18n && p.lang) {
    const { LangContext } = p.i18n
    // 子が描かれる前に t() の言語をそろえる
    p.i18n.setLang(p.lang)
    children = (
      <LangContext.Provider value={p.lang}>
        <PevenLabels.Provider value={p.i18n.labels(p.lang)}>{children}</PevenLabels.Provider>
      </LangContext.Provider>
    )
  }
  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      {p.desktopLook && desktop && <GlobalStyles styles={desktopStyles} />}
      {children}
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
