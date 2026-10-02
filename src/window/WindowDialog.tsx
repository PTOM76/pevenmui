import { createContext, useContext, type KeyboardEventHandler, type ReactNode } from 'react'
import { Box, Dialog, DialogTitle, type DialogProps } from '@mui/material'
import { WindowPortal, type WindowMode } from './WindowPortal'

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
  const dialog = (
    <Dialog open={p.open} onClose={p.onClose} onKeyDown={p.onKeyDown} {...p.dialogProps}>
      {p.title && <DialogTitle sx={{ fontSize: 16, py: 1.5 }}>{p.title}</DialogTitle>}
      {p.children}
    </Dialog>
  )
  if (mode === 'dialog') return dialog
  return (
    <WindowPortal open={p.open} mode={mode} name={p.name} title={p.windowTitle ?? p.title ?? ''} width={p.width} height={p.height} onClose={() => p.onClose?.()} focusSignal={p.focusSignal} fallback={dialog}>
      <Box
        onKeyDown={p.onKeyDown}
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', '& > .MuiDialogContent-root': { flex: 1, overflowY: 'auto' } }}
      >
        {p.children}
      </Box>
    </WindowPortal>
  )
}
