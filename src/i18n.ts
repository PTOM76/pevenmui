import { createContext, useContext } from 'react'
import { HTML_LANG, LABELS, LANG_NAMES, type Labels } from './labels'

type Dict = Record<string, string>

/** `{name}` を `vars.name` で置き換える */
const format = (text: string, vars?: Record<string, string | number>) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text

/** ja_jp → ja-JP（PevenMUI が知っている言語は今までの値） */
function toHtmlLang(lang: string) {
  const known = (HTML_LANG as Record<string, string>)[lang]
  if (known) return known
  const [l, r] = lang.split('_')
  return r ? `${l}-${r.toUpperCase()}` : l
}

/** 言語の自称（PevenMUI が知らない言語は Intl.DisplayNames で作る） */
function nativeName(lang: string) {
  const known = LANG_NAMES.find(([l]) => l === lang)
  if (known) return known[1]
  const tag = toHtmlLang(lang)
  try {
    return new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? lang
  } catch {
    return lang
  }
}

/** ブラウザの言語（優先順）から、対応している言語を選ぶ。繁体字は台湾、香港、マカオと zh-Hant */
function pickLang<L extends string>(langs: readonly L[], fallback: L): L {
  const prefs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const pref of prefs) {
    const p = pref.toLowerCase()
    const exact = langs.find((l) => l === p.replace('-', '_'))
    if (exact) return exact
    const base = p.split('-')[0]
    if (base === 'zh') {
      const zh = (/hant|tw|hk|mo/.test(p) ? 'zh_tw' : 'zh_cn') as L
      if (langs.includes(zh)) return zh
    }
    const same = langs.find((l) => l.split('_')[0] === base)
    if (same) return same
  }
  return fallback
}

export type I18nOptions<M extends Record<B, Dict>, B extends string, L extends string = keyof M & string> = {
  /** 言語ごとの訳文。キーは ja_jp 形式 */
  messages: M & { [K in keyof M]: Record<keyof M[B], string> }
  /** キーの正（ほかの言語に欠けたキーは型エラー）。既定は en_us */
  base?: B
  /** 訳がないときと、ブラウザの言語が対応外のときの言語。既定は base */
  fallback?: L
  /** `<html lang>` の値の上書き */
  htmlLang?: Partial<Record<L, string>>
  /** 設定に表示する言語の名前の上書き */
  names?: Partial<Record<L, string>>
  /** 部品の文字の上書き、追加（PevenMUI にない言語を足すとき） */
  labels?: Partial<Record<L, Partial<Labels>>>
}

/**
 * アプリの多言語化。対応言語は `messages` に渡した言語だけになる。
 * `t()` は React の外（Canvas 描画やエラーメッセージ）からも使用できる
 */
export function createI18n<M extends Record<B, Dict>, B extends string = 'en_us'>(o: I18nOptions<M, B>) {
  type Lang = keyof M & string
  type Key = keyof M[B] & string
  const messages = o.messages as unknown as Record<Lang, Record<Key, string>>
  const base = (o.base ?? 'en_us') as B & Lang
  const fallback = (o.fallback ?? base) as Lang
  const langs = Object.keys(messages) as Lang[]
  let current: Lang = fallback

  const htmlLang = (lang: Lang) => o.htmlLang?.[lang] ?? toHtmlLang(lang)

  /** 部品の文字。アプリの言語、fallback、英語の順に探す */
  const labelCache = new Map<Lang, Labels>()
  const labels = (lang: Lang = current): Labels => {
    let l = labelCache.get(lang)
    if (!l) {
      const own = LABELS as Record<string, Labels>
      l = { ...own.en_us, ...own[fallback], ...o.labels?.[fallback], ...own[lang], ...o.labels?.[lang] }
      labelCache.set(lang, l)
    }
    return l
  }

  const LangContext = createContext<Lang>(fallback)

  /** 訳文を返す。`{name}` は `vars.name` で置き換える */
  const t = (key: Key, vars?: Record<string, string | number>): string =>
    format(messages[current]?.[key] ?? messages[fallback]?.[key] ?? messages[base]?.[key] ?? key, vars)

  return {
    langs,
    base,
    fallback,
    LangContext,
    /** ブラウザの言語から選ぶ */
    detect: () => pickLang(langs, fallback),
    /** 設定値から実際の言語を決める（auto はブラウザの言語に従う） */
    resolve: (setting: 'auto' | Lang): Lang => (setting === 'auto' ? pickLang(langs, fallback) : langs.includes(setting) ? setting : fallback),
    /** 表示する言語を変える（`<html lang>` も変わったときだけ書く） */
    setLang(lang: Lang) {
      current = lang
      const h = htmlLang(lang)
      if (typeof document !== 'undefined' && document.documentElement.lang !== h) document.documentElement.lang = h
    },
    getLang: () => current,
    htmlLang,
    /** 設定の言語の選択肢（各言語の自称） */
    options: (): [Lang, string][] => langs.map((l) => [l, o.names?.[l] ?? nativeName(l)]),
    labels,
    t,
    /** 画面部品用の `t`。言語が変わると呼び出し元が再描画される */
    useT() {
      useContext(LangContext)
      return t
    },
    /** 表示中の言語（言語が変わったら描き直したい処理の依存に使う） */
    useLang: () => useContext(LangContext),
    /** 型だけを取り出すための値（`typeof i18n.Lang`） */
    Lang: undefined as unknown as Lang,
    Key: undefined as unknown as Key,
  }
}

export type I18n = ReturnType<typeof createI18n<Record<string, Dict>, string>>
