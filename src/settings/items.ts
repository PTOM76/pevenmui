// 設定の項目を定義する関数（check、choice、number、value）と、定義から型と既定値を作る関数。訳文のキーの型はアプリが K で決める

/** 選択肢の値（Choice には文字列で渡す） */
type OptionValue = string | number

/** 設定の項目の定義。kind で設定画面の行の形が決まる（value は画面を自前で作るか、画面に出さない） */
export type Item<T, K extends string = string> =
  | { kind: 'check'; default: T; label: K; help?: K }
  | { kind: 'choice'; default: T; label: K; help?: K; options: readonly (readonly [T, K])[] }
  | { kind: 'choice'; default: T; label: K; help?: K; values: readonly T[]; format: (v: T) => string }
  | { kind: 'number'; default: T; label: K; help?: K; min: number; max: number; step: number; unit?: string; round?: (v: number) => number }
  | { kind: 'value'; default: T; label?: K; help?: K }

type Meta<K extends string> = { label: K; help?: K }

// format の引数があるため Item<T> は Item<unknown> に代入できない。集まりの制約には any を使う
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyItem<K extends string = string> = Item<any, K>

/** 設定画面の分類（page）に属する項目の集まり。page が null なら設定画面に出さない */
export interface ItemGroup<I extends Record<string, AnyItem>, C extends string = string> {
  page: C | null
  items: I
}

/** 項目の値の型 */
export type ValueOf<I> = I extends { default: infer T } ? T : never

/** 訳文のキーの型 K と分類の型 C を決めて、定義の関数を作る（アプリで 1 回呼ぶ） */
export function settingItems<K extends string, C extends string>() {
  function choice<T extends OptionValue>(def: NoInfer<T>, meta: Meta<K> & { options: readonly (readonly [T, K])[] }): Item<T, K>
  function choice<T extends OptionValue>(def: NoInfer<T>, meta: Meta<K> & { values: readonly T[]; format: (v: T) => string }): Item<T, K>
  function choice<T extends OptionValue>(def: T, meta: Meta<K> & object): Item<T, K> {
    return { kind: 'choice', default: def, ...meta } as Item<T, K>
  }
  return {
    /** オンとオフの項目 */
    check: (def: boolean, meta: Meta<K>): Item<boolean, K> => ({ kind: 'check', default: def, ...meta }),
    /** 選択肢から選ぶ項目（名前は訳文のキーか、format で作る） */
    choice,
    /** 数値を入力する項目。round を省くと整数に丸める */
    number: (def: number, meta: Meta<K> & { min: number; max: number; step: number; unit?: string; round?: (v: number) => number }): Item<number, K> => ({
      kind: 'number',
      default: def,
      ...meta,
    }),
    /** 画面を自前で作る項目と、画面に出さない項目（メニューの切り替え、覚えておく値など） */
    value: <T>(def: T, meta: Partial<Meta<K>> = {}): Item<T, K> => ({ kind: 'value', default: def, ...meta }),
    /** 分類に属する項目の集まり（page が null なら設定画面に出さない） */
    defineItems: <I extends Record<string, AnyItem<K>>>(page: C | null, items: I): ItemGroup<I, C> => ({ page, items }),
  }
}

/** 検索の対象にする訳文のキー（名前、説明、選択肢の名前） */
export function searchKeys<K extends string>(item: AnyItem<K>): K[] {
  const keys: K[] = []
  if (item.label) keys.push(item.label)
  if (item.help) keys.push(item.help)
  if (item.kind === 'choice' && 'options' in item) keys.push(...item.options.map(([, k]) => k))
  return keys
}

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never
/** 集まりの一覧から、すべての項目を 1 つにした型 */
export type ItemsOf<G extends readonly ItemGroup<Record<string, AnyItem>>[]> = UnionToIntersection<G[number]['items']>
/** 項目から作る設定の型 */
export type SettingsOf<I> = { [N in keyof I]: ValueOf<I[N]> }

/** 集まりの一覧から、項目の表と既定値を作る */
export function collectItems<G extends readonly ItemGroup<Record<string, AnyItem>>[]>(groups: G) {
  const items = Object.assign({}, ...groups.map((g) => g.items)) as ItemsOf<G>
  const defaults = Object.fromEntries(Object.entries(items as Record<string, AnyItem>).map(([k, item]) => [k, item.default])) as SettingsOf<ItemsOf<G>>
  return { items, defaults }
}
