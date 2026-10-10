// ダイアログの開閉と、開くときに渡す値（ダイアログごとに useState を書かずに済ませる。名前の型はアプリが決める）
import { useCallback, useMemo, useState } from 'react'

/** ダイアログの開閉をまとめて持つ。`Id` はアプリのダイアログの名前 */
export function useDialogs<Id extends string>() {
  // 開いているダイアログと、開くときに渡した値（値のないものは true）
  const [opened, setOpened] = useState<ReadonlyMap<Id, unknown>>(new Map())
  // 開いた回数（設定を開いたまま、もう一度開いたら、別の窓の設定画面を手前に出す合図に使う）
  const [counts, setCounts] = useState<ReadonlyMap<Id, number>>(new Map())
  const open = useCallback((id: Id, arg: unknown = true) => {
    setOpened((m) => new Map(m).set(id, arg))
    setCounts((m) => new Map(m).set(id, (m.get(id) ?? 0) + 1))
  }, [])
  const close = useCallback((id: Id) => {
    setOpened((m) => {
      if (!m.has(id)) return m
      const next = new Map(m)
      next.delete(id)
      return next
    })
  }, [])
  return useMemo(
    () => ({
      isOpen: (id: Id) => opened.has(id),
      /** 開くときに渡した値（開いていなければ null） */
      arg: <T>(id: Id) => (opened.has(id) ? (opened.get(id) as T) : null),
      openCount: (id: Id) => counts.get(id) ?? 0,
      open,
      close,
      /** onClick などに渡す、開く関数 */
      opener: (id: Id) => () => open(id),
      /** onClose に渡す、閉じる関数 */
      closer: (id: Id) => () => close(id),
    }),
    [opened, counts, open, close],
  )
}

/** useDialogs() の戻り値 */
export type Dialogs<Id extends string> = ReturnType<typeof useDialogs<Id>>
