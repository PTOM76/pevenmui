/** PevenMUI の部品の寸法。`PevenProvider theme={{ peven: { menu: { iconSize: 14 } } }}` のように一部だけ上書きできる */
export const PEVEN_TOKENS = {
  menu: {
    /** メニューバーの項目の高さ */
    barHeight: 26,
    /** メニューバーの文字の大きさ */
    barFontSize: 13,
    /** メニューバーから開くメニューの最小の幅 */
    minWidth: 240,
    /** サブメニューの最小の幅 */
    submenuMinWidth: 200,
    /** チェックの大きさ */
    checkSize: 12,
    /** サブメニューの矢印の大きさ */
    arrowSize: 10,
  },
  /** PC の上のバー（AppHeader） */
  header: {
    height: 32,
  },
  /** PC の下のステータスバー */
  statusBar: {
    height: 24,
    fontSize: 12,
  },
  /** 設定のダイアログ（PC） */
  settings: {
    /** 左の分類の一覧の幅 */
    navWidth: 180,
  },
}

export type PevenTokens = typeof PEVEN_TOKENS

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** 寸法の上書き（一部だけでよい） */
export type PevenTokensOptions = DeepPartial<PevenTokens>

/** テーマから寸法を取り出す（PevenProvider を通していないテーマでは既定値） */
export const pevenTokens = (theme: object): PevenTokens => (theme as { peven?: PevenTokens }).peven ?? PEVEN_TOKENS
