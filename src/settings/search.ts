import { createContext, useContext } from 'react'

/** 比べやすい形にする（全角・半角と大文字・小文字の違いをなくす） */
const normalize = (s: string) => s.normalize('NFKC').toLowerCase()

/** `text` が検索語 `query` を含むか（空の検索語には一致しない） */
export function matches(text: string | undefined, query: string) {
  const q = normalize(query.trim())
  return !!q && !!text && normalize(text).includes(q)
}

/** 入力中の検索語。項目名や説明文が一致したら色を付けるのに使う */
export const SearchContext = createContext('')

/** 一致した項目名に付ける見た目 */
const HIT_SX = { bgcolor: 'action.selected', borderRadius: 0.5, px: 0.25, mx: -0.25, width: 'fit-content' }

/** `texts` のどれかが検索語に一致したら、項目名に付ける見た目を返す（検索語が空なら何もしない） */
export function useHighlight(...texts: (string | undefined)[]) {
  const query = useContext(SearchContext)
  return texts.some((s) => matches(s, query)) ? HIT_SX : {}
}

/** 行を並べる部品向け: 一度だけ呼び、行ごとに `hit(項目名, 説明文)` で見た目を得る */
export function useHighlighter() {
  const query = useContext(SearchContext)
  return (...texts: (string | undefined)[]) => (texts.some((s) => matches(s, query)) ? HIT_SX : {})
}
