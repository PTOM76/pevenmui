// コマンド（キーとメニューとボタンが、名前で呼ぶ操作）の型と、使い方。アプリごとに、文脈（C。今の状態の窓口）と、名前の型（L）を決めて使う。
// コマンドは、名前、押せるか、チェックの有無、実行を持つ。表は 1 度だけ作り、今の状態は文脈で渡す
import { useRef } from 'react'
import { keyLabelOf, type Keymap } from '../keymap/keymap'
import { useShortcuts } from '../keymap/useShortcuts'
import type { MenuEntry } from '../menu/MenuList'

/** 訳文を返す関数 */
export type Translate<L extends string = string> = (key: L, vars?: Record<string, string | number>) => string

/** 1 つの操作。C は文脈（今の状態の窓口）、L は名前（訳文のキー）の型 */
export interface CommandSpec<C, L extends string = string> {
  /** 名前（状態で変わるなら関数） */
  label: L | ((c: C, t: Translate<L>) => string)
  /** キーの割り当てのない操作で、メニューの右に表示する操作（ホイールなど） */
  hint?: (c: C) => string
  /** 表示するか（省くといつも表示する。使えない環境や、試験的機能の設定がオフのときに隠す） */
  visible?: (c: C) => boolean
  /** 押せるか（省くといつも押せる） */
  enabled?: (c: C) => boolean
  /** オンとオフの操作なら、今オンか */
  checked?: (c: C) => boolean
  run: (c: C) => void
  /** 押せないときはキーを受け取らない（ブラウザやほかの部品に任せる）。省くと、キーはいつも受け取り、押せないときは何もしない */
  keyOnlyWhenEnabled?: boolean
}

/** アプリの文脈と名前の型を決めて、コマンドの集まりを定義する関数を作る（表の名前の型を保ったまま返す） */
export const commandDefiner =
  <C, L extends string = string>() =>
  <T extends Record<string, CommandSpec<C, L>>>(commands: T) =>
    commands

/**
 * コマンドの表を使う（アプリで 1 回呼ぶ）。今の状態は ref に持ち、実行や判定のときに最新を読む。
 * `item(id)` は、メニューの項目（名前、キーの表記、押せるか、チェック）を作る。表示しないコマンドは null
 */
export function useCommandSet<C, L extends string, Id extends string>(table: Record<Id, CommandSpec<C, L>>, ctx: C, keymap: Keymap<string>, t: Translate<L>) {
  const ref = useRef(ctx)
  ref.current = ctx
  const visible = (id: Id) => table[id].visible?.(ref.current) ?? true
  const enabled = (id: Id) => visible(id) && (table[id].enabled?.(ref.current) ?? true)
  const run = (id: Id) => {
    if (enabled(id)) table[id].run(ref.current)
  }
  const item = (id: Id): MenuEntry | null => {
    if (!visible(id)) return null
    const cmd = table[id]
    const c = ref.current
    return {
      label: typeof cmd.label === 'function' ? cmd.label(c, t) : t(cmd.label),
      // キーを割り当てられる操作なら今の割り当て、そうでなければホイールなどの操作の表記
      shortcut: id in keymap ? keyLabelOf(keymap, id) : cmd.hint?.(c),
      disabled: !enabled(id),
      checked: cmd.checked?.(c),
      onClick: () => run(id),
    }
  }
  return { item, run, enabled, visible, ctx: () => ref.current }
}

export type CommandSet<Id extends string = string> = { run: (id: Id) => void; enabled: (id: Id) => boolean }

/**
 * キーの割り当てにある操作を、コマンドで処理する（アプリで 1 回呼ぶ）。
 * keyOnlyWhenEnabled のコマンドは押せるときだけキーを受け取り、それ以外はいつも受け取って、押せなければ何もしない
 */
export function useCommandKeys<Id extends string>(set: CommandSet<Id>, table: Record<Id, { keyOnlyWhenEnabled?: boolean }>, keymap: Keymap<Id>) {
  const handlers = Object.fromEntries((Object.keys(keymap) as Id[]).map((id) => [id, !table[id].keyOnlyWhenEnabled || set.enabled(id) ? () => set.run(id) : undefined])) as Partial<Record<Id, (() => void) | undefined>>
  useShortcuts(keymap, handlers)
}
