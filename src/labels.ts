import { createContext, useContext } from 'react'
import ja from './lang/ja_jp.json'
import en from './lang/en_us.json'
import ko from './lang/ko_kr.json'
import zhCn from './lang/zh_cn.json'
import zhTw from './lang/zh_tw.json'

/** 部品の中に出す文字（lang/ の JSON。updateAvailableBuild の {from} {to} は版）。アプリの言語に合わせて `PevenLabels` で切り替える */
export const jaLabels = ja
export type Labels = typeof jaLabels
export const enLabels: Labels = en
export const koLabels: Labels = ko
export const zhCnLabels: Labels = zhCn
export const zhTwLabels: Labels = zhTw

/** PevenMUI が訳を持つ言語（Minecraft 風の名前）。 @deprecated 対応言語は createI18n で決める */
export type PevenLang = 'ja_jp' | 'en_us' | 'ko_kr' | 'zh_cn' | 'zh_tw'

/** 言語ごとの部品の文字。 @deprecated `i18n.labels(lang)` を使う */
export const LABELS: Record<PevenLang, Labels> = { ja_jp: jaLabels, en_us: enLabels, ko_kr: koLabels, zh_cn: zhCnLabels, zh_tw: zhTwLabels }

/** 設定の言語選択肢（各言語の自称）。 @deprecated `i18n.options()` を使う */
export const LANG_NAMES: [PevenLang, string][] = [
  ['ja_jp', '日本語'],
  ['en_us', 'English'],
  ['ko_kr', '한국어'],
  ['zh_cn', '简体中文'],
  ['zh_tw', '繁體中文'],
]

/** ブラウザの言語から選ぶ。繁体字は台湾・香港・マカオと zh-Hant。 @deprecated `i18n.detect()` を使う */
export function detectLang(): PevenLang {
  const l = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'ja'
  if (l.startsWith('ja')) return 'ja_jp'
  if (l.startsWith('ko')) return 'ko_kr'
  if (l.startsWith('zh')) return /hant|tw|hk|mo/.test(l) ? 'zh_tw' : 'zh_cn'
  return 'en_us'
}

/** `<html lang>` に入れる値。 @deprecated `i18n.htmlLang(lang)` を使う */
export const HTML_LANG: Record<PevenLang, string> = { ja_jp: 'ja', en_us: 'en', ko_kr: 'ko', zh_cn: 'zh-CN', zh_tw: 'zh-TW' }

/** 部品の文字。既定は日本語 */
export const PevenLabels = createContext<Labels>(jaLabels)

export const useLabels = () => useContext(PevenLabels)

/** `{name}` を `vars.name` で置き換える */
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
