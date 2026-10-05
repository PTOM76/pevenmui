import { useEffect, useRef } from 'react'
import { actionOf, comboOf, type Keymap } from './keymap'

/** 操作ごとの処理。今は使えない操作は undefined にする（そのキーはブラウザの既定の動きのまま。Tab のフォーカス移動など） */
export type ShortcutHandlers<Id extends string = string> = Partial<Record<Id, (() => void) | undefined>>

/**
 * キーボード操作。処理を持たない操作のキーは何もしないので、操作を持つ場所ごとに呼んでよい。
 * 入力欄、ダイアログ、メニューの中のキーは扱わない
 */
export function useShortcuts<Id extends string>(keymap: Keymap<Id>, handlers: ShortcutHandlers<Id>) {
  const ref = useRef({ keymap, handlers })
  ref.current = { keymap, handlers }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 入力欄の中や、メニューなどが処理済みのキー（Esc で閉じたときなど）は扱わない。
      // ダイアログ・メニューの中のキーも扱わない（設定画面の矢印キーや Space で、アプリの操作が起きないように）
      if (e.defaultPrevented || (e.target as HTMLElement).closest('input, textarea, [role="dialog"], [role="menu"]')) return
      const combo = comboOf(e)
      if (!combo) return
      const id = actionOf(ref.current.keymap, combo)
      const action = id && ref.current.handlers[id]
      if (!action) return
      // 画面の文字を選んでいるときのコピー、切り取りは、ブラウザの文字のコピーに任せる
      const sel = window.getSelection()
      if ((id === 'copy' || id === 'cut') && sel && !sel.isCollapsed) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
