// アプリの定義（名前、id、URL、言語）。React にも Vite にも依存しないので、画面からも vite.config.ts からも読み込める

export type AppInfo = {
  /** 保存のキーの接頭辞などに使う英小文字の id（例: wevocalsynth）。変えると保存済みの設定が読めなくなる */
  id: string
  /** 表示名 */
  name: string
  /** ホーム画面などの短い名前（既定は name） */
  shortName?: string
  /** 説明（index.html の description と og） */
  description?: string
  author?: string
  /** ソースコードの URL */
  repository?: string
  /** 使い方の URL */
  guide?: string
  /** 配信先の URL（OGP の絶対 URL）。ビルド時は SITE_URL が優先 */
  site?: string
  /** 既定の言語（ja_jp 形式）。`<html lang>` と og:locale に使う。既定は en_us */
  lang?: string
}

/** ja_jp → ja、zh_cn → zh-CN（中国語だけ地域を残す） */
export function htmlLangOf(lang: string) {
  const [l, r] = lang.split('_')
  return r && l === 'zh' ? `${l}-${r.toUpperCase()}` : l
}

/** ja_jp → ja_JP（og:locale） */
export function ogLocaleOf(lang: string) {
  const [l, r] = lang.split('_')
  return r ? `${l}_${r.toUpperCase()}` : l
}

/** アプリの定義に、保存のキーなどを作る関数を足す */
export function defineApp<T extends AppInfo>(info: T) {
  const lang = info.lang ?? 'en_us'
  return {
    ...info,
    shortName: info.shortName ?? info.name,
    lang,
    htmlLang: htmlLangOf(lang),
    ogLocale: ogLocaleOf(lang),
    /** localStorage のキー（`id.name`） */
    key: (name: string) => `${info.id}.${name}`,
    /** Cache Storage などの名前（`id-name`） */
    cacheName: (name: string) => `${info.id}-${name}`,
  }
}

export type App = ReturnType<typeof defineApp<AppInfo>>
