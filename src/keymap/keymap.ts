/**
 * キーボードショートカットの割り当て。操作ごとに既定のキーを持ち、設定で変えたものだけを保存する。
 * キーは `e.code`（配列によらない位置）に、修飾キーを Ctrl（Mac の Cmd も）、Alt、Shift の順に `+` でつないだもの（`Ctrl+Shift+KeyS`）
 */

/** 操作。`label` は画面に表示する名前（アプリが訳して渡す） */
export interface KeyAction<Id extends string = string> {
  id: Id
  label: string
  keys: string[]
}

/** 既定から変えた割り当て（空の配列はキーなし） */
export type KeymapOverrides<Id extends string = string> = Partial<Record<Id, string[]>>
export type Keymap<Id extends string = string> = Record<Id, string[]>

/** 操作の既定のキー。アプリの設定で既定を変えるときは `defaults` を渡す */
export type DefaultKeys<Id extends string = string> = (id: Id) => string[]

/** 既定のキー（`actions` の `keys`） */
export const actionKeys = <Id extends string>(actions: readonly { id: Id; keys: string[] }[]): DefaultKeys<Id> => (id) => actions.find((a) => a.id === id)?.keys ?? []

/** 今の割り当て（変えたものはそれ、ほかは既定） */
export function resolveKeymap<Id extends string>(actions: readonly { id: Id; keys: string[] }[], overrides: KeymapOverrides<Id>, defaults: DefaultKeys<Id> = actionKeys(actions)): Keymap<Id> {
  return Object.fromEntries(actions.map((a) => [a.id, overrides[a.id] ?? defaults(a.id)])) as Keymap<Id>
}

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'])

/** 押したキーの組み合わせ。修飾キーだけを押したときは null */
export function comboOf(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (MODIFIER_CODES.has(e.code) || !e.code) return null
  return [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', e.code].filter(Boolean).join('+')
}

/** 組み合わせに割り当てた操作（`keymap` に並んだ順で最初のもの） */
export function actionOf<Id extends string>(keymap: Keymap<Id>, combo: string): Id | undefined {
  return (Object.keys(keymap) as Id[]).find((id) => keymap[id].includes(combo))
}

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc', Space: 'Space', Backquote: '`', Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', IntlRo: '\\', IntlYen: '¥',
}

/** 表示する名前（`Ctrl+Shift+KeyS` → `Ctrl+Shift+S`） */
export function comboLabel(combo: string): string {
  return combo
    .split('+')
    .map((p) => KEY_NAMES[p] ?? p.replace(/^Key|^Digit|^Numpad(?=\d)/, ''))
    .join('+')
}

/** 操作のキーの表示（最初のもの。なければ undefined。メニューの右に表示する） */
export const keyLabelOf = <Id extends string>(keymap: Keymap<Id>, id: Id) => (keymap[id][0] ? comboLabel(keymap[id][0]) : undefined)

/** 一覧のダイアログ（`ShortcutsDialog`）の行。キーのある操作だけを [キー, 名前] で並べる */
export function keymapRows<Id extends string>(actions: readonly { id: Id; label: string }[], keymap: Keymap<Id>): [string, string][] {
  return actions.filter((a) => keymap[a.id].length).map((a) => [keymap[a.id].map(comboLabel).join(' / '), a.label])
}
