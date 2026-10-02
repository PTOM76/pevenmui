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

/** 部品の文字。既定は日本語 */
export const PevenLabels = createContext<Labels>(jaLabels)

export const useLabels = () => useContext(PevenLabels)

/** `{name}` を `vars.name` で置き換える */
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
