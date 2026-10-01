import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import createCache, { type EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { CssBaseline } from '@mui/material'

/**
 * 画面の出し方。dialog はページ内のダイアログ、popup は window.open のポップアップ、
 * window は Window Management API で位置を覚えるサブウィンドウ（別の画面にも置ける）、pip は Document Picture-in-Picture（常に手前）
 */
export type WindowMode = 'dialog' | 'popup' | 'window' | 'pip'

interface Props {
  open: boolean
  mode: Exclude<WindowMode, 'dialog'>
  /** 位置・大きさを覚えるときの名前 */
  name: string
  title: string
  width: number
  height: number
  onClose: () => void
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
  cache: EmotionCache
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
async function openWindow(mode: Props['mode'], name: string, width: number, height: number): Promise<Window | null> {
  const saved = loadPlacement(name)
  const w = saved?.w ?? width
  const h = saved?.h ?? height
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
 * 中身を別の窓（ポップアップ・サブウィンドウ・PiP）に出す。窓を閉じたら onClose、open が false になったら窓を閉じる。
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
    let win: Window | null = null
    let disposed = false
    let htmlObserver: MutationObserver | null = null
    setFailed(false)
    const remember = () => {
      if (!win || win.closed) return
      savePlacement(p.name, p.mode === 'pip'
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

    openWindow(p.mode, p.name, p.width, p.height).then((w) => {
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
      const syncHtml = () => {
        for (const a of Array.from(document.documentElement.attributes)) doc.documentElement.setAttribute(a.name, a.value)
      }
      syncHtml()
      htmlObserver = new MutationObserver(syncHtml)
      htmlObserver.observe(document.documentElement, { attributes: true })
      const root = doc.createElement('div')
      root.style.cssText = 'height:100vh;display:flex;flex-direction:column'
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
    if (opened) opened.root.ownerDocument.title = p.title
  }, [opened, p.title])

  if (!p.open) return null
  if (failed) return p.fallback
  if (!opened) return null
  return createPortal(
    <CacheProvider value={opened.cache}>
      <CssBaseline />
      {p.children}
    </CacheProvider>,
    opened.root,
  )
}
