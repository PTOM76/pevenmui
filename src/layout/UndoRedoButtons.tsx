// 上部のバーの右端に置く、元に戻すとやり直しのボタン（AppHeader の actions に渡す。アプリで共通。題はアプリが訳して渡す）
import { faRotateLeft, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { HeaderIcon } from './AppHeader'

/** 元に戻す、やり直し。`mobile` ではスマホの上部バーの大きさにする。題にはキーの割り当てを付けて渡す */
export function UndoRedoButtons(p: { mobile: boolean; canUndo: boolean; canRedo: boolean; busy?: boolean; onUndo: () => void; onRedo: () => void; undoTitle: string; redoTitle: string }) {
  return (
    <>
      <HeaderIcon small={!p.mobile} title={p.undoTitle} icon={faRotateLeft} disabled={!p.canUndo || p.busy} onClick={p.onUndo} />
      <HeaderIcon small={!p.mobile} title={p.redoTitle} icon={faRotateRight} disabled={!p.canRedo || p.busy} onClick={p.onRedo} />
    </>
  )
}
