import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ButtonBase, ClickAwayListener, MenuList, Paper, Popper } from '@mui/material'
import { MENU_MAX_HEIGHT, renderEntries, type MenuGroup } from './MenuList'

/**
 * メニューバーの文字の並べ方。英字（Roboto）と日本語（システムのフォント）では文字の上下の余白が
 * 違うため、行の高さを固定して縦方向の中央にそろえ、フォントが混ざっても高さがずれないようにする
 */
export const BAR_TEXT_SX = {
  height: 26,
  lineHeight: '26px',
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
} as const

/**
 * アプリとしてインストールして開いているか（アドレスバーのない窓）。Alt+英字はブラウザのタブではブラウザ自身のメニューと
 * ぶつかるので、そのときだけ使う
 */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches
}

/** `key` が `group` のアクセスキーか（大文字・小文字は区別しない） */
const isAccessKey = (group: MenuGroup, key: string) => !!group.accessKey && key.length === 1 && key.toUpperCase() === group.accessKey.toUpperCase()

/**
 * PC 用の、Windows のアプリと同じ操作感のメニューバー。
 * - クリックで開き、同じ項目をもう一度クリックすると閉じる
 * - 開いている間は、隣の項目にマウスを乗せるだけで切り替わる
 * - マウスが離れても閉じない。外側をクリックするか Esc で閉じる
 * - Alt / F10 でメニューバーに入り、← → で項目を移動、↓ / Enter で開く
 * - アクセスキー（`accessKey`）があれば「ファイル(F)」と表示する。メニューバーに入っているときはその英字で開く。
 *   アプリとしてインストールして開いているときは、Alt+英字でも直接開く。英字の下線は、使えるときだけ付ける
 * MUI の Menu は画面全体を覆う透明な幕を出し、隣の項目へのマウス移動をふさぐため、幕のない Popper で作る
 */
export default function MenuBar({ menus }: { menus: MenuGroup[] }) {
  const [open, setOpen] = useState<number | null>(null)
  // キーボードで移動中の項目（メニューを開いていないとき）
  const [focus, setFocus] = useState<number | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const close = () => setOpen(null)
  const wrap = (i: number) => (i + menus.length) % menus.length
  const menusRef = useRef(menus)
  menusRef.current = menus
  // アクセスキーの下線: Alt+英字で直接開けるとき（アプリとして開いているとき）はいつも、
  // そうでなければメニューバーに入っている間だけ（Windows と同じく、使えるときに示す）
  const underline = isStandalone() || focus !== null || open !== null

  // Alt（単独で押して離したとき）/ F10 でメニューバーに入る。Windows と同じく、もう一度押すと抜ける
  useEffect(() => {
    let altAlone = false
    const down = (e: globalThis.KeyboardEvent) => {
      altAlone = e.key === 'Alt' && !e.repeat
      // Alt+英字で直接開く（アプリとしてインストールして開いているときだけ）
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key !== 'Alt' && isStandalone()) {
        const i = menusRef.current.findIndex((m) => isAccessKey(m, e.code.startsWith('Key') ? e.code.slice(3) : e.key))
        if (i >= 0) {
          e.preventDefault()
          altAlone = false
          setFocus(i)
          setOpen(i)
          return
        }
      }
      if (e.key === 'F10' && !e.shiftKey) {
        e.preventDefault()
        toggleBarFocus()
      }
    }
    const up = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Alt' && altAlone) {
        e.preventDefault()
        toggleBarFocus()
      }
      altAlone = false
    }
    const toggleBarFocus = () =>
      setFocus((f) => {
        if (f !== null) {
          buttons.current[f]?.blur()
          return null
        }
        buttons.current[0]?.focus()
        return 0
      })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // メニューバー上でのキー操作（メニューを開いていないとき）
  const onBarKey = (e: KeyboardEvent, index: number) => {
    const move = (to: number) => {
      e.preventDefault()
      setFocus(to)
      buttons.current[to]?.focus()
    }
    const byKey = menus.findIndex((m) => isAccessKey(m, e.key))
    if (byKey >= 0) {
      // アクセスキーの英字で、そのメニューを開く
      e.preventDefault()
      setFocus(byKey)
      setOpen(byKey)
    } else if (e.key === 'ArrowRight') move(wrap(index + 1))
    else if (e.key === 'ArrowLeft') move(wrap(index - 1))
    else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(index)
    } else if (e.key === 'Escape') {
      setFocus(null)
      buttons.current[index]?.blur()
    }
  }

  // 開いているメニューの中でのキー操作（↑ ↓ と Enter は MenuList が扱う）
  const onMenuKey = (e: KeyboardEvent) => {
    if (open === null) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const to = wrap(open + (e.key === 'ArrowRight' ? 1 : -1))
      setOpen(to)
      setFocus(to)
    } else if (e.key === 'Escape') {
      // 1回目の Esc はメニューを閉じてメニューバーに戻る
      e.preventDefault()
      setFocus(open)
      buttons.current[open]?.focus()
      close()
    }
  }

  return (
    <ClickAwayListener onClickAway={close}>
      <span style={{ display: 'inline-flex' }}>
        {menus.map((m, index) => (
          <ButtonBase
            key={m.label}
            ref={(el) => {
              buttons.current[index] = el
            }}
            className="peven-menubar-item"
            aria-haspopup="menu"
            aria-expanded={open === index}
            onClick={() => setOpen((o) => (o === index ? null : index))}
            onMouseEnter={() => open !== null && open !== index && setOpen(index)}
            onKeyDown={(e) => onBarKey(e, index)}
            onBlur={() => setFocus((f) => (f === index && open === null ? null : f))}
            sx={{
              ...BAR_TEXT_SX,
              px: 1.25,
              borderRadius: 0.5,
              bgcolor: open === index ? 'action.selected' : focus === index ? 'action.focus' : undefined,
              '&:hover': { bgcolor: open === index ? 'action.selected' : 'action.hover' },
            }}
          >
            {m.label}
            {m.accessKey && <span>({underline ? <u>{m.accessKey}</u> : m.accessKey})</span>}
          </ButtonBase>
        ))}
        <Popper
          open={open !== null}
          anchorEl={open !== null ? buttons.current[open] : null}
          placement="bottom-start"
          sx={{ zIndex: 'modal' }}
        >
          <Paper elevation={4} sx={{ minWidth: 240, mt: 0.25, maxHeight: MENU_MAX_HEIGHT, overflowY: 'auto' }}>
            <MenuList dense autoFocusItem sx={{ py: 0.5 }} onKeyDown={onMenuKey}>
              {open !== null && renderEntries(menus[open].entries, close)}
            </MenuList>
          </Paper>
        </Popper>
      </span>
    </ClickAwayListener>
  )
}
