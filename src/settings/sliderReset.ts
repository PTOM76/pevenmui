// スライダーのダブルクリックで既定値に戻すか（設定。アプリの外側で Provider に値を入れる）
import { createContext, useContext } from 'react'

/** スライダーのダブルクリックで既定値に戻すか（既定は戻す） */
export const SliderResetContext = createContext(true)

/** スライダーに付ける、ダブルクリックで `reset` する指定（設定で切っていれば何も付けない） */
export function useDoubleClickReset(reset: () => void) {
  return useContext(SliderResetContext) ? { onDoubleClick: reset } : {}
}
