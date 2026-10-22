import { createContext, useContext, useEffect, type KeyboardEventHandler, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogTitle, IconButton, Tooltip, type DialogProps } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindowRestore, faXmark } from '@fortawesome/free-solid-svg-icons'
import { WindowPortal, type WindowMode } from './WindowPortal'
import { useDock } from './dock'

/** アプリ全体のダイアログの出し方。WindowDialog はここから読む（既定はページ内のダイアログ） */
export const WindowModeContext = createContext<WindowMode>('dialog')

interface Props {
  open: boolean
  /** 未指定なら閉じられない（処理中など）。別の窓は × で閉じられてしまうので、そのときも呼ぶ */
  onClose?: () => void
  title?: string
  /** 別の窓の枠に出す題名（既定は title） */
  windowTitle?: string
  /** 位置・大きさを覚えるときの名前（別の窓のとき） */
  name: string
  /** 別の窓の大きさ */
  width: number
  height: number
  onKeyDown?: KeyboardEventHandler<HTMLElement>
  /** ページ内のダイアログのときの指定（maxWidth など） */
  dialogProps?: Partial<DialogProps>
  /** 変わるたびに、別の窓で開いているこのダイアログを手前に出す（開いたまま、もう一度開こうとしたとき） */
  focusSignal?: number
  /** 出し方。未指定なら WindowModeContext に従う */
  mode?: WindowMode
  /** 画面の下の欄（DockArea）に置けるようにする。ページ内のダイアログの題名の横にボタンが出て、置いたかどうかは name ごとに覚える（DockProvider の中だけ） */
  dockable?: boolean
  /** 題名の右に閉じるボタン（×）を出す。値はボタンの名前（ツールチップ）。下のボタンの行を置かない、狭い画面向けのダイアログで使う（ページ内のダイアログのみ） */
  closeLabel?: string
  /** DialogContent・DialogActions */
  children: ReactNode
}

/**
 * MUI の Dialog と同じ形で書けて、設定に従って別の窓（ポップアップ・PiP など）にも出せるダイアログ。
 * 別の窓では題名は窓の枠に出るので、中身とボタンだけを並べる
 */
export function WindowDialog(p: Props) {
  const ctxMode = useContext(WindowModeContext)
  const mode = p.mode ?? ctxMode
  const dock = useDock()
  const docked = !!p.dockable && !!dock && dock.isDocked(p.name)
  // 欄に置くときは、開いている間タブとして登録する
  useEffect(() => {
    if (!docked || !p.open || !dock) return
    return dock.register({ name: p.name, title: p.title ?? p.name, onClose: () => p.onClose?.() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked, p.open, p.name, p.title])
  if (docked) {
    if (!p.open || !dock?.host || dock.active !== p.name) return null
    return createPortal(
      <Box onKeyDown={p.onKeyDown} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', '& > .MuiDialogContent-root': { flex: 1, overflowY: 'auto' } }}>
        {p.children}
      </Box>,
      dock.host,
    )
  }
  const dialog = (
    <Dialog open={p.open} onClose={p.onClose} onKeyDown={p.onKeyDown} {...p.dialogProps}>
      {p.title && (
        <DialogTitle sx={{ fontSize: 16, py: p.dialogProps?.fullScreen ? 0.75 : 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {p.title}
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            {p.dockable && dock && (
              <Tooltip title={dock.labels.dock}>
                <IconButton size="small" aria-label={dock.labels.dock} onClick={() => dock.setDocked(p.name, true)}>
                  <FontAwesomeIcon icon={faWindowRestore} />
                </IconButton>
              </Tooltip>
            )}
            {p.closeLabel && p.onClose && (
              <Tooltip title={p.closeLabel}>
                <IconButton size="small" aria-label={p.closeLabel} onClick={p.onClose}>
                  <FontAwesomeIcon icon={faXmark} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </DialogTitle>
      )}
      {p.children}
    </Dialog>
  )
  if (mode === 'dialog') return dialog
  return (
    <WindowPortal open={p.open} mode={mode} name={p.name} title={p.windowTitle ?? p.title ?? ''} width={p.width} height={p.height} fitHeight onClose={() => p.onClose?.()} focusSignal={p.focusSignal} fallback={dialog}>
      <Box
        onKeyDown={p.onKeyDown}
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', '& > .MuiDialogContent-root': { flex: 1, overflowY: 'auto' } }}
      >
        {p.children}
      </Box>
    </WindowPortal>
  )
}
