import { DrillMenu } from './DrillMenu'
import { vh } from '../uiScale'
import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Box, Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Paper, Popper, Typography } from '@mui/material'
import { pevenTokens } from '../tokens'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons'

/** メニューの1項目。`divider` なら区切り線、`submenu` なら横に開くサブメニュー */
export type MenuEntry =
  | {
      label: string
      /** 表示用のショートカット（例: "Ctrl+Z"） */
      shortcut?: string
      disabled?: boolean
      /** 指定すると ON/OFF の項目になり、ON のときチェックを表示する */
      checked?: boolean
      onClick: () => void
    }
  | { label: string; disabled?: boolean; submenu: MenuEntry[] }
  | { divider: true }

/** メニューのまとまり（「ファイル」「編集」など） */
export interface MenuGroup {
  label: string
  entries: MenuEntry[]
  /** アクセスキー（英字1文字。例: "F"）。「ファイル(F)」と表示し、メニューバーに入っているときにこのキーで開く */
  accessKey?: string
}

/** 画面に収まらない長さのメニューは、この高さで止めて中をスクロールする */
export const MENU_MAX_HEIGHT = `calc(${vh(100)} - 48px)`
/** サブメニューを閉じるまでの猶予（ミリ秒）。斜めにマウスを動かして中へ入る間に閉じないように */
const CLOSE_DELAY_MS = 200

/**
 * 同じ段で開いているサブメニューを閉じる関数。別のサブメニューを開いたら、前のものは猶予を待たずにすぐ閉じる
 * （待つと、移った直後に 2 つのサブメニューが重なって見える）。いちばん上の段は、開くメニューが 1 つなので共通にする
 */
const SiblingContext = createContext<{ current: (() => void) | null }>({ current: null })

/** 横に開くサブメニュー（マウスを乗せる・→ / Enter で開き、← / Esc で戻る） */
function SubmenuItem({ entry, close, keyPrefix }: { entry: Extract<MenuEntry, { submenu: MenuEntry[] }>; close: () => void; keyPrefix: string }) {
  const anchor = useRef<HTMLLIElement>(null)
  const [open, rawSetOpen] = useState<null | 'mouse' | 'key'>(null)
  const timer = useRef(0)
  const cancelClose = () => window.clearTimeout(timer.current)
  const siblings = useContext(SiblingContext)
  // この中のサブメニューどうしの段
  const children = useMemo(() => ({ current: null as (() => void) | null }), [])
  const closeNow = useRef(() => {
    window.clearTimeout(timer.current)
    rawSetOpen(null)
  })
  // 開くときは、同じ段で開いているほかのサブメニューをすぐ閉じる
  const setOpen = (v: typeof open | ((o: typeof open) => typeof open)) => {
    rawSetOpen((o) => {
      const next = typeof v === 'function' ? v(o) : v
      if (next && siblings.current !== closeNow.current) {
        const prev = siblings.current
        siblings.current = closeNow.current
        if (prev) queueMicrotask(prev)
      }
      return next
    })
  }
  const closeSoon = () => {
    cancelClose()
    timer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY_MS)
  }
  const back = () => {
    setOpen(null)
    anchor.current?.focus()
  }
  return (
    <>
      <MenuItem
        ref={anchor}
        dense
        disabled={entry.disabled}
        aria-haspopup="menu"
        aria-expanded={!!open}
        selected={!!open}
        onMouseEnter={() => {
          cancelClose()
          setOpen((o) => o ?? 'mouse')
        }}
        onMouseLeave={closeSoon}
        // タップはマウスが乗った扱いの直後にクリックが来るので、乗っただけで開いたものは閉じずに残す
        onClick={() => setOpen((o) => (o === 'key' ? null : 'key'))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setOpen('key')
          }
        }}
      >
        <ListItemText>{entry.label}</ListItemText>
        <Box component="span" sx={{ ml: 3, fontSize: (t) => pevenTokens(t).menu.arrowSize, opacity: 0.7, display: 'inline-flex' }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </Box>
      </MenuItem>
      <Popper
        open={!!open}
        anchorEl={anchor.current}
        placement="right-start"
        // 親のメニューの中（フォーカスの閉じ込めの内側）に置き、はみ出しは fixed で描いて切られないようにする
        disablePortal
        popperOptions={{ strategy: 'fixed' }}
        sx={{ zIndex: 'modal' }}
      >
        <Paper elevation={4} sx={{ minWidth: (t) => pevenTokens(t).menu.submenuMinWidth, maxHeight: MENU_MAX_HEIGHT, overflowY: 'auto' }} onMouseEnter={cancelClose} onMouseLeave={closeSoon}>
          <MenuList
            dense
            autoFocusItem={open === 'key'}
            sx={{ py: 0.5 }}
            onKeyDown={(e) => {
              // 親のメニューのキー操作（上下の移動・メニューの切り替え）に渡さない
              e.stopPropagation()
              if (e.key === 'ArrowLeft' || e.key === 'Escape') {
                e.preventDefault()
                back()
              }
            }}
          >
            <SiblingContext.Provider value={children}>{renderEntries(entry.submenu, close, `${keyPrefix}s`)}</SiblingContext.Provider>
          </MenuList>
        </Paper>
      </Popper>
    </>
  )
}

/** サブメニューを開かず、中身を区切り線で囲んでその場に並べる（スマホの一覧用） */
export function flattenEntries(entries: MenuEntry[]): MenuEntry[] {
  const flat = entries.flatMap((e): MenuEntry[] => ('submenu' in e ? [{ divider: true }, ...flattenEntries(e.submenu).map((s) => ('divider' in s || !e.disabled ? s : { ...s, disabled: true })), { divider: true }] : [e]))
  // 続く区切り線と、端の区切り線は除く
  return flat.filter((e, i) => !('divider' in e) || (i > 0 && i < flat.length - 1 && !('divider' in flat[i - 1])))
}

/**
 * 項目の一覧を MUI のメニュー項目として並べる。選んだらメニューを閉じる。
 * 複数のグループを1つのメニューに並べるときは、key が重ならないよう `keyPrefix` を変える
 */
export function renderEntries(entries: MenuEntry[], close: () => void, keyPrefix = '') {
  return entries.map((e, i) =>
    'divider' in e ? (
      // MUI は「項目の直後の区切り線」だけ上下に余白を足すため、サブメニューの隣では余白が消えて縮んでいた。どこでも同じ詰めた余白にする
      <Divider key={`${keyPrefix}${i}`} sx={{ '&&': { my: 0.5 } }} />
    ) : 'submenu' in e ? (
      <SubmenuItem key={`${keyPrefix}${i}`} entry={e} close={close} keyPrefix={`${keyPrefix}${i}`} />
    ) : (
      <MenuItem
        key={`${keyPrefix}${i}`}
        dense
        disabled={e.disabled}
        onClick={() => {
          close()
          e.onClick()
        }}
      >
        {e.checked !== undefined && (
          <ListItemIcon sx={{ visibility: e.checked ? 'visible' : 'hidden', fontSize: (t) => pevenTokens(t).menu.checkSize }}>
            <FontAwesomeIcon icon={faCheck} />
          </ListItemIcon>
        )}
        <ListItemText>{e.label}</ListItemText>
        {e.shortcut && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
            {e.shortcut}
          </Typography>
        )}
      </MenuItem>
    ),
  )
}

/** 右クリックで開くメニュー（`position` はクリック位置、null なら閉じている）。指で操作する画面では、サブメニューを段階で開く（DrillMenu） */
export function ContextMenu(props: {
  position: { x: number; y: number } | null
  entries: MenuEntry[]
  onClose: () => void
}) {
  return (
    <Menu
      open={!!props.position}
      onClose={props.onClose}
      anchorReference="anchorPosition"
      anchorPosition={props.position ? { top: props.position.y, left: props.position.x } : undefined}
      slotProps={{ paper: { sx: { maxHeight: 'calc(100vh - 48px)' } } }}
    >
      {window.matchMedia('(pointer: coarse)').matches ? <DrillMenu entries={props.entries} onClose={props.onClose} /> : renderEntries(props.entries, props.onClose)}
    </Menu>
  )
}
