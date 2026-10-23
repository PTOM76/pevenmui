import { createContext, useContext, useEffect, useState, type KeyboardEventHandler, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogTitle, IconButton, Tooltip, type DialogProps } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindowRestore, faXmark } from '@fortawesome/free-solid-svg-icons'
import { WindowPortal, type WindowMode } from './WindowPortal'
import { useDock, type DockEdge } from './dock'

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
  /** 覚えた置き場所がないとき、標準で置く端（ダイアログにすると選ぶまで、欄に置く）。dockable のときだけ */
  defaultDock?: DockEdge
  /** 標準の置き場所（defaultDock）の欄の標準の大きさ（px。欄が下か上なら高さ、左か右なら幅）。利用者が欄の大きさを変えていなければ使う */
  dockSize?: number
  /** 左や右の欄に縦に積むときの、このパネルの高さ（px）。省くと等分 */
  dockLength?: number
  /** 画面の端の欄（DockArea）に置けるようにする。ページ内のダイアログの題名の横にボタンが出て、置いたかどうかは name ごとに覚える（DockProvider の中だけ） */
  dockable?: boolean
  /** 別の窓で、欄に置くボタンを右端からずらす幅（px）。右端に、中身が自分のボタンを置くとき */
  dockInset?: number
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
  const dock = useDock()
  // 欄のタブを本体の窓の外へ出したときは、その位置に別の窓（ポップアップ）で開く（閉じるまで）
  const tearAt = dock?.tearOf(p.name) ?? null
  const mode = tearAt ? 'popup' : (p.mode ?? ctxMode)
  // 置く端: 覚えた置き場所、なければ標準の置き場所。ダイアログにすると選んでいれば、欄には置かない
  const pref = dock?.edgeOf(p.name)
  const edge: DockEdge | null = p.dockable && dock ? (pref === 'dialog' ? null : (pref ?? p.defaultDock ?? null)) : null
  const docked = edge !== null
  // 窓にして開いたものは、閉じたら普通の出し方に戻す
  const clearTear = dock?.clearTear
  useEffect(() => {
    if (!p.open && tearAt) clearTear?.(p.name)
  }, [p.open, tearAt, clearTear, p.name])
  // 別の窓に出しているあいだ、窓の位置を見張る。本体の窓の端に寄せて離したら、その端の欄に置く
  const [popup, setPopup] = useState<Window | null>(null)
  const trackWindow = dock?.trackWindow
  useEffect(() => {
    if (!popup || !p.dockable || !trackWindow) return
    return trackWindow(p.name, popup)
  }, [popup, p.dockable, p.name, trackWindow])
  // 欄に置くときは、開いている間タブとして登録する
  useEffect(() => {
    if (!docked || !p.open || !dock) return
    return dock.register({ name: p.name, title: p.title ?? p.name, edge: edge!, size: edge === p.defaultDock ? p.dockSize : undefined, length: p.dockLength, onClose: () => p.onClose?.() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked, edge, p.open, p.name, p.title, p.dockSize, p.dockLength])
  if (docked) {
    const host = dock?.hostOf(p.name)
    if (!p.open || !host || !dock?.isVisible(p.name)) return null
    return createPortal(
      <Box onKeyDown={p.onKeyDown} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', '& > .MuiDialogContent-root': { flex: 1, overflowY: 'auto' } }}>
        {p.children}
      </Box>,
      host,
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
                <IconButton size="small" aria-label={dock.labels.dock} onClick={() => dock.setDocked(p.name, true, p.defaultDock)}>
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
    <WindowPortal open={p.open} mode={mode} name={p.name} at={tearAt ?? undefined} onWindow={mode === 'popup' || mode === 'window' ? setPopup : undefined} title={p.windowTitle ?? p.title ?? ''} width={p.width} height={p.height} fitHeight onClose={() => p.onClose?.()} focusSignal={p.focusSignal} fallback={dialog}>
      <Box
        onKeyDown={p.onKeyDown}
        sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', '& > .MuiDialogContent-root': { flex: 1, overflowY: 'auto' } }}
      >
        {/* 別の窓には題名の行がないので、欄に置くボタンは、中身の最初の行（メニューバーなど）の右端に重ねる（行を増やさない） */}
        {p.dockable && dock && (
          <Box sx={{ position: 'absolute', top: 2, right: 4 + (p.dockInset ?? 0), zIndex: 2 }}>
            <Tooltip title={dock.labels.dock}>
              <IconButton size="small" aria-label={dock.labels.dock} onClick={() => dock.setDocked(p.name, true, p.defaultDock)}>
                <FontAwesomeIcon icon={faWindowRestore} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {p.children}
      </Box>
    </WindowPortal>
  )
}
