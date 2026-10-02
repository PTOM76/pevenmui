import { useRef, useState } from 'react'
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuList, Paper, Popper, Typography } from '@mui/material'
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
export const MENU_MAX_HEIGHT = 'calc(100vh - 48px)'
/** サブメニューを閉じるまでの猶予（ミリ秒）。斜めにマウスを動かして中へ入る間に閉じないように */
const CLOSE_DELAY_MS = 200

/** 横に開くサブメニュー（マウスを乗せる・→ / Enter で開き、← / Esc で戻る） */
function SubmenuItem({ entry, close, keyPrefix }: { entry: Extract<MenuEntry, { submenu: MenuEntry[] }>; close: () => void; keyPrefix: string }) {
  const anchor = useRef<HTMLLIElement>(null)
  const [open, setOpen] = useState<null | 'mouse' | 'key'>(null)
  const timer = useRef(0)
  const cancelClose = () => window.clearTimeout(timer.current)
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
        <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: 24, fontSize: 10, opacity: 0.7 }} />
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
        <Paper elevation={4} sx={{ minWidth: 200, maxHeight: MENU_MAX_HEIGHT, overflowY: 'auto' }} onMouseEnter={cancelClose} onMouseLeave={closeSoon}>
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
            {renderEntries(entry.submenu, close, `${keyPrefix}s`)}
          </MenuList>
        </Paper>
      </Popper>
    </>
  )
}

/** サブメニューを開かず、中身を区切り線で囲んでその場に並べる（スマホの一覧用） */
export function flattenEntries(entries: MenuEntry[]): MenuEntry[] {
  return entries.flatMap((e): MenuEntry[] => ('submenu' in e ? [{ divider: true }, ...flattenEntries(e.submenu).map((s) => ('divider' in s || !e.disabled ? s : { ...s, disabled: true })), { divider: true }] : [e]))
}

/**
 * 項目の一覧を MUI のメニュー項目として並べる。選んだらメニューを閉じる。
 * 複数のグループを1つのメニューに並べるときは、key が重ならないよう `keyPrefix` を変える
 */
export function renderEntries(entries: MenuEntry[], close: () => void, keyPrefix = '') {
  return entries.map((e, i) =>
    'divider' in e ? (
      <Divider key={`${keyPrefix}${i}`} />
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
          <ListItemIcon sx={{ visibility: e.checked ? 'visible' : 'hidden' }}>
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

/** 右クリックで開くメニュー（`position` はクリック位置、null なら閉じている） */
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
      slotProps={{ paper: { sx: { maxHeight: MENU_MAX_HEIGHT } } }}
    >
      {/* 指で操作する画面では、横に開くサブメニューは押しにくいのでその場に並べる */}
      {renderEntries(window.matchMedia('(pointer: coarse)').matches ? flattenEntries(props.entries) : props.entries, props.onClose)}
    </Menu>
  )
}
