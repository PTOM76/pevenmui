import { createContext, useContext } from 'react'

/** 部品の中に出す文字。アプリの言語に合わせて `PevenLabels` で切り替える */
export const jaLabels = {
  ok: 'OK',
  cancel: 'キャンセル',
  apply: '適用',
  close: '閉じる',
  back: '戻る',
  menu: 'メニュー',
  more: 'ほかのボタン',
  resetAll: 'すべて既定値に戻す',
  search: '設定を検索',
  noResults: '一致する設定がありません',
  version: 'バージョン',
  updateAvailable: '新しいバージョンがあります',
  /** `{from}` `{to}` は版 */
  updateAvailableBuild: '（{from} → {to}）',
  updateReload: '更新',
  updateCheck: '今すぐ確認',
  updateLatest: '最新バージョンです',
  updateUnsupported: 'この環境では確認できません',
  updateFailed: '確認に失敗しました（ネットワーク接続を確認してください）',
}

export type Labels = typeof jaLabels

export const enLabels: Labels = {
  ok: 'OK',
  cancel: 'Cancel',
  apply: 'Apply',
  close: 'Close',
  back: 'Back',
  menu: 'Menu',
  more: 'More',
  resetAll: 'Reset all to defaults',
  search: 'Search settings',
  noResults: 'No matching settings',
  version: 'Version',
  updateAvailable: 'A new version is available',
  updateAvailableBuild: ' ({from} → {to})',
  updateReload: 'Update',
  updateCheck: 'Check now',
  updateLatest: 'You are on the latest version',
  updateUnsupported: 'Cannot check in this environment',
  updateFailed: 'Check failed (please check your network connection)',
}

export const koLabels: Labels = {
  ok: '확인',
  cancel: '취소',
  apply: '적용',
  close: '닫기',
  back: '뒤로',
  menu: '메뉴',
  more: '더 보기',
  resetAll: '모두 기본값으로',
  search: '설정 검색',
  noResults: '일치하는 설정이 없습니다',
  version: '버전',
  updateAvailable: '새 버전이 있습니다',
  updateAvailableBuild: ' ({from} → {to})',
  updateReload: '업데이트',
  updateCheck: '지금 확인',
  updateLatest: '최신 버전입니다',
  updateUnsupported: '이 환경에서는 확인할 수 없습니다',
  updateFailed: '확인에 실패했습니다 (네트워크 연결을 확인하세요)',
}

export const zhCnLabels: Labels = {
  ok: '确定',
  cancel: '取消',
  apply: '应用',
  close: '关闭',
  back: '返回',
  menu: '菜单',
  more: '更多',
  resetAll: '全部恢复默认',
  search: '搜索设置',
  noResults: '没有匹配的设置',
  version: '版本',
  updateAvailable: '有新版本',
  updateAvailableBuild: '（{from} → {to}）',
  updateReload: '更新',
  updateCheck: '立即检查',
  updateLatest: '已是最新版本',
  updateUnsupported: '此环境无法检查',
  updateFailed: '检查失败（请检查网络连接）',
}

export const zhTwLabels: Labels = {
  ok: '確定',
  cancel: '取消',
  apply: '套用',
  close: '關閉',
  back: '返回',
  menu: '選單',
  more: '更多',
  resetAll: '全部恢復預設',
  search: '搜尋設定',
  noResults: '沒有符合的設定',
  version: '版本',
  updateAvailable: '有新版本',
  updateAvailableBuild: '（{from} → {to}）',
  updateReload: '更新',
  updateCheck: '立即檢查',
  updateLatest: '已是最新版本',
  updateUnsupported: '此環境無法檢查',
  updateFailed: '檢查失敗（請檢查網路連線）',
}

/** 対応言語（Minecraft 風の名前） */
export type PevenLang = 'ja_jp' | 'en_us' | 'ko_kr' | 'zh_cn' | 'zh_tw'

export const LABELS: Record<PevenLang, Labels> = { ja_jp: jaLabels, en_us: enLabels, ko_kr: koLabels, zh_cn: zhCnLabels, zh_tw: zhTwLabels }

/** 設定の言語選択肢（各言語の自称） */
export const LANG_NAMES: [PevenLang, string][] = [
  ['ja_jp', '日本語'],
  ['en_us', 'English'],
  ['ko_kr', '한국어'],
  ['zh_cn', '简体中文'],
  ['zh_tw', '繁體中文'],
]

/** ブラウザの言語から選ぶ。繁体字は台湾・香港・マカオと zh-Hant */
export function detectLang(): PevenLang {
  const l = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'ja'
  if (l.startsWith('ja')) return 'ja_jp'
  if (l.startsWith('ko')) return 'ko_kr'
  if (l.startsWith('zh')) return /hant|tw|hk|mo/.test(l) ? 'zh_tw' : 'zh_cn'
  return 'en_us'
}

/** `<html lang>` に入れる値 */
export const HTML_LANG: Record<PevenLang, string> = { ja_jp: 'ja', en_us: 'en', ko_kr: 'ko', zh_cn: 'zh-CN', zh_tw: 'zh-TW' }

/** 部品の文字。既定は日本語 */
export const PevenLabels = createContext<Labels>(jaLabels)

export const useLabels = () => useContext(PevenLabels)

/** `{name}` を `vars.name` で置き換える */
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
