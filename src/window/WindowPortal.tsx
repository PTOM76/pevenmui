import { getUiScale } from '../uiScale'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import createCache, { type EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { CssBaseline, ThemeProvider, type Theme } from '@mui/material'

/**
 * 画面の出し方。
 * - ページ内: dialog（MUI のダイアログ）、nativeDialog（HTML の <dialog> をモーダルで）、popover（Popover API。モーダルにせず後ろも触れる）
 * - 別の窓: popup（window.open のポップアップ）、tab（別タブ）、
 *   window（Window Management API で位置を覚えるサブウィンドウ。別の画面にも置ける）、pip（Document Picture-in-Picture。常に手前）
 */
export type WindowMode = 'dialog' | 'nativeDialog' | 'popover' | 'popup' | 'tab' | 'window' | 'pip'

/**
 * 環境に合った出し方。PWA（アドレスバーが出ない）で Chromium 系ならポップアップ、それ以外はダイアログ
 * （ふつうのタブではポップアップに URL が出て見た目が悪く、Chromium 以外の PWA はポップアップを別のブラウザの窓で開くことがあるため）
 */
export function autoWindowMode(): WindowMode {
  const pwa = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? []
  const chromium = brands.some((b) => b.brand === 'Chromium')
  return pwa && chromium ? 'popup' : 'dialog'
}

type ExternalMode = Exclude<WindowMode, 'dialog' | 'nativeDialog' | 'popover'>
const isExternal = (m: WindowMode): m is ExternalMode => m === 'popup' || m === 'tab' || m === 'window' || m === 'pip'

interface Props {
  open: boolean
  mode: Exclude<WindowMode, 'dialog'>
  /** 位置・大きさを覚えるときの名前 */
  name: string
  title: string
  width: number
  height: number
  onClose: () => void
  /** 変わるたびに、開いている別の窓を手前に出す（開いたまま、もう一度開こうとしたときに増やす） */
  focusSignal?: number
  /** 別の窓を開いたあと、高さを中身に合わせる（中身の高さが決まっているダイアログ用。設定画面のように窓いっぱいに広がるものには使わない） */
  fitHeight?: boolean
  /** 窓を開けなかったとき（未対応・ブロック・権限なし）に代わりに出すもの */
  fallback: ReactNode
  children: ReactNode
}

interface Placement {
  x?: number
  y?: number
  w: number
  h: number
}

interface Opened {
  root: HTMLElement
  /** 別の窓に出すときの Emotion のキャッシュ（ページ内なら null） */
  cache: EmotionCache | null
}

/**
 * メニュー・ツールチップなどを、中身と同じ場所（別の窓、<dialog> の最前面のレイヤー）に出させる。
 * 既定では元のページの body に出て、別の窓では元のページに、<dialog> では後ろに隠れてしまう
 */
function withContainer(outer: Theme, root: HTMLElement): Theme {
  const c = outer.components ?? {}
  const put = <K extends 'MuiPopover' | 'MuiPopper' | 'MuiModal'>(k: K) => ({ ...c[k], defaultProps: { ...c[k]?.defaultProps, container: root } })
  return { ...outer, components: { ...c, MuiPopover: put('MuiPopover'), MuiPopper: put('MuiPopper'), MuiModal: put('MuiModal') } }
}

/** ページ内の窓（<dialog>・popover）の見た目。中央に置き、MUI のダイアログに近い形にする */
const IN_PAGE_CSS = `
.pevenmui-window { padding: 0; border: none; border-radius: 4px; color: inherit; background: transparent;
  width: min(720px, calc(100vw / var(--ui-scale, 1) - 32px)); height: min(560px, calc(100vh / var(--ui-scale, 1) - 32px)); box-shadow: 0 11px 15px -7px rgba(0,0,0,.2), 0 24px 38px 3px rgba(0,0,0,.14);
  display: flex; flex-direction: column; overflow: hidden; margin: auto; inset: 0; position: fixed; }
.pevenmui-window::backdrop { background: rgba(0,0,0,.5); }
`

function ensureInPageStyle() {
  if (document.getElementById('pevenmui-window-style')) return
  const s = document.createElement('style')
  s.id = 'pevenmui-window-style'
  s.textContent = IN_PAGE_CSS
  document.head.appendChild(s)
}

/** ページ内の窓を作って開く。対応していなければ null */
function openInPage(mode: 'nativeDialog' | 'popover', title: string, onClose: () => void): { root: HTMLElement; close: () => void } | null {
  ensureInPageStyle()
  if (mode === 'nativeDialog') {
    if (typeof HTMLDialogElement === 'undefined') return null
    const d = document.createElement('dialog')
    d.className = 'pevenmui-window'
    d.setAttribute('aria-label', title)
    // Esc は閉じる処理をこちらで行う（ブラウザに閉じさせると React の状態とずれる）
    d.addEventListener('cancel', (e) => {
      e.preventDefault()
      onClose()
    })
    // 背景（<dialog> 自身の外側の部分）を押したら閉じる
    d.addEventListener('click', (e) => e.target === d && onClose())
    document.body.appendChild(d)
    d.showModal()
    return { root: d, close: () => (d.close(), d.remove()) }
  }
  if (!('popover' in HTMLElement.prototype)) return null
  const el = document.createElement('div')
  el.className = 'pevenmui-window'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', title)
  // manual: 外を押しても閉じない（作業しながら開いておける）
  el.popover = 'manual'
  el.addEventListener('keydown', (e) => e.key === 'Escape' && !e.defaultPrevented && onClose())
  document.body.appendChild(el)
  el.showPopover()
  return { root: el, close: () => (el.hidePopover(), el.remove()) }
}

// Document Picture-in-Picture は TypeScript の型にまだない
declare global {
  interface Window {
    documentPictureInPicture?: { requestWindow(o: { width: number; height: number }): Promise<Window> }
    getScreenDetails?: () => Promise<{ screens: { availLeft: number; availTop: number; availWidth: number; availHeight: number }[]; currentScreen: { availLeft: number; availTop: number; availWidth: number; availHeight: number } }>
  }
}

const storageKey = (name: string) => `pevenmui.window.${name}`

function loadPlacement(name: string): Placement | null {
  try {
    const raw = localStorage.getItem(storageKey(name))
    return raw ? (JSON.parse(raw) as Placement) : null
  } catch {
    return null
  }
}

function savePlacement(name: string, p: Placement) {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(p))
  } catch {
    // 覚えられなくても次は既定の位置で開く
  }
}

/** 窓を開く。開けなければ null */
async function openWindow(mode: ExternalMode, name: string, width: number, height: number): Promise<Window | null> {
  // 窓の大きさの指定が無いと、ブラウザは別タブで開く
  if (mode === 'tab') return window.open('', name)
  const saved = loadPlacement(name)
  // 画面の大きさ（zoom）を変えていれば、既定の大きさもその分広げる
  const w = saved?.w ?? width * getUiScale()
  const h = saved?.h ?? height * getUiScale()
  if (mode === 'pip') {
    // 位置は決められない（ブラウザが置く）。大きさだけ覚える
    if (!window.documentPictureInPicture) return null
    try {
      return await window.documentPictureInPicture.requestWindow({ width: w, height: h })
    } catch {
      return null
    }
  }
  // 既定は開いている画面の中央
  let x = window.screenX + (window.outerWidth - w) / 2
  let y = window.screenY + (window.outerHeight - h) / 2
  if (mode === 'window') {
    // 別の画面の座標へ置くには Window Management の許可が要る。覚えた位置がどれかの画面の中にあればそこへ戻す
    if (!window.getScreenDetails) return null
    try {
      const { screens, currentScreen: cur } = await window.getScreenDetails()
      x = cur.availLeft + (cur.availWidth - w) / 2
      y = cur.availTop + (cur.availHeight - h) / 2
      const inside = (s: (typeof screens)[number]) =>
        saved?.x !== undefined && saved.y !== undefined &&
        saved.x >= s.availLeft && saved.y >= s.availTop && saved.x < s.availLeft + s.availWidth && saved.y < s.availTop + s.availHeight
      if (screens.some(inside)) {
        x = saved!.x!
        y = saved!.y!
      }
    } catch {
      return null
    }
  }
  return window.open('', name, `popup,width=${Math.round(w)},height=${Math.round(h)},left=${Math.round(x)},top=${Math.round(y)}`)
}

/** 元のページの CSS（フォントなど）を新しい窓へ写す。MUI の部品の CSS は窓ごとの Emotion のキャッシュが入れる */
function copyStyles(from: Document, to: Document) {
  const base = to.createElement('base')
  base.href = from.baseURI
  to.head.appendChild(base)
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const style = to.createElement('style')
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join('\n')
      to.head.appendChild(style)
    } catch {
      // 別オリジンの CSS は中身を読めないので、リンクごと写す
      if (!sheet.href) continue
      const link = to.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      to.head.appendChild(link)
    }
  }
}

/**
 * 中身を別の窓（ポップアップ・別タブ・サブウィンドウ・PiP）や、ページ内の <dialog>・popover に出す。窓を閉じたら onClose、open が false になったら窓を閉じる。
 * 窓を開けなければ fallback（ふつうはダイアログ）を出す
 */
export function WindowPortal(p: Props) {
  const [opened, setOpened] = useState<Opened | null>(null)
  const [failed, setFailed] = useState(false)
  const onCloseRef = useRef(p.onClose)
  onCloseRef.current = p.onClose
  const titleRef = useRef(p.title)
  titleRef.current = p.title

  useEffect(() => {
    if (!p.open) return
    const mode = p.mode
    setFailed(false)
    if (!isExternal(mode)) {
      const page = openInPage(mode, titleRef.current, () => onCloseRef.current())
      if (!page) {
        setFailed(true)
        return
      }
      setOpened({ root: page.root, cache: null })
      return () => {
        page.close()
        setOpened(null)
      }
    }
    let win: Window | null = null
    let disposed = false
    let htmlObserver: MutationObserver | null = null
    const remember = () => {
      // 別タブは窓の位置・大きさを持たない
      if (!win || win.closed || mode === 'tab') return
      savePlacement(p.name, mode === 'pip'
        ? { w: win.innerWidth, h: win.innerHeight }
        : { x: win.screenX, y: win.screenY, w: win.innerWidth, h: win.innerHeight })
    }
    // 窓の × で閉じたとき
    const onHide = () => {
      if (disposed) return
      remember()
      onCloseRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current()
    }
    // 元のページを閉じたら一緒に閉じる（PiP はブラウザが閉じる）
    const closeChild = () => win?.close()

    openWindow(mode, p.name, p.width, p.height).then((w) => {
      if (disposed) {
        w?.close()
        return
      }
      if (!w) {
        setFailed(true)
        return
      }
      win = w
      const doc = w.document
      doc.title = titleRef.current
      copyStyles(document, doc)
      // 配色は <html> のクラス（colorSchemeSelector: 'class'）で切り替わるので、元のページの属性を写し、変わったら追う
      // 窓のタイトルバーの色は theme-color と color-scheme で決まるので、アプリの今の配色（body の背景）に合わせる
      const themeMeta = doc.createElement('meta')
      themeMeta.name = 'theme-color'
      const schemeMeta = doc.createElement('meta')
      schemeMeta.name = 'color-scheme'
      doc.head.append(themeMeta, schemeMeta)
      const syncHtml = () => {
        for (const a of Array.from(document.documentElement.attributes)) doc.documentElement.setAttribute(a.name, a.value)
        // クラスが変わった直後は CSS 変数がまだ反映されていないことがあるので、次のフレームで読む
        requestAnimationFrame(() => {
          themeMeta.content = getComputedStyle(document.body).backgroundColor
          schemeMeta.content = getComputedStyle(document.documentElement).colorScheme || 'normal'
        })
      }
      syncHtml()
      htmlObserver = new MutationObserver(syncHtml)
      htmlObserver.observe(document.documentElement, { attributes: true })
      const root = doc.createElement('div')
      root.style.cssText = 'height:calc(100vh / var(--ui-scale, 1));display:flex;flex-direction:column'
      root.dataset.uiScaleRoot = ''
      doc.body.appendChild(root)
      w.addEventListener('pagehide', onHide)
      doc.addEventListener('keydown', onKey)
      window.addEventListener('pagehide', closeChild)
      setOpened({ root, cache: createCache({ key: 'pwin', container: doc.head }) })
    })
    return () => {
      disposed = true
      remember()
      htmlObserver?.disconnect()
      window.removeEventListener('pagehide', closeChild)
      win?.close()
      setOpened(null)
    }
  }, [p.open, p.mode, p.name, p.width, p.height])

  useEffect(() => {
    if (opened?.cache) opened.root.ownerDocument.title = p.title
  }, [opened, p.title])

  // 高さを中身に合わせる。中身の各部分（本文・ボタン）の本来の高さを足し、窓の中の高さとの差だけ窓を伸び縮みさせる。
  // 中身が変わったとき（書き出しの形式を変えて欄が増えたときなど）も合わせ直す
  useEffect(() => {
    const win = opened?.cache && opened.root.ownerDocument.defaultView
    if (!p.fitHeight || !win || p.mode === 'tab' || p.mode === 'pip') return
    const fit = () => {
      const body = opened.root.firstElementChild as HTMLElement | null
      if (!body) return
      // 本文は窓いっぱいに伸ばしているので、測る間だけ伸ばすのをやめて本来の高さにする
      const parts = [body, ...Array.from(body.children)] as HTMLElement[]
      const saved = parts.map((e) => e.style.flex)
      parts.forEach((e) => (e.style.flex = 'none'))
      const need = Array.from(body.children).reduce((s, c) => s + (c as HTMLElement).offsetHeight, 0) * getUiScale()
      parts.forEach((e, i) => (e.style.flex = saved[i]))
      const target = Math.min(need, win.screen.availHeight * 0.9)
      if (need > 0 && Math.abs(target - win.innerHeight) > 8) win.resizeBy(0, Math.round(target - win.innerHeight))
    }
    let raf = 0
    const schedule = () => {
      win.cancelAnimationFrame(raf)
      raf = win.requestAnimationFrame(() => (raf = win.requestAnimationFrame(fit)))
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(opened.root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      win.cancelAnimationFrame(raf)
    }
  }, [opened, p.fitHeight, p.mode])
  // 開いたまま、もう一度開こうとしたとき（`focusSignal` が変わったとき）は、別の窓を手前に出す
  // （ページ内のダイアログはもとから手前にある。PiP はブラウザによっては前に出ない）
  useEffect(() => {
    if (p.focusSignal === undefined || !opened?.cache) return
    opened.root.ownerDocument.defaultView?.focus()
    // focusSignal が変わったときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focusSignal])

  if (!p.open) return null
  if (failed) return p.fallback
  if (!opened) return null
  const content = <ThemeProvider theme={(outer: Theme) => withContainer(outer, opened.root)}>{p.children}</ThemeProvider>
  return createPortal(
    opened.cache ? (
      <CacheProvider value={opened.cache}>
        <CssBaseline />
        {content}
      </CacheProvider>
    ) : (
      content
    ),
    opened.root,
  )
}
