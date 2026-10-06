// Vite のプラグイン（vite.config.ts から読み込む。Node でそのまま動くよう、相対の import は .ts を付ける）
import { execSync } from 'node:child_process'
import type { Plugin } from 'vite'
import { defineApp, type AppInfo } from './app.ts'

/** ビルドしたコミットの短いハッシュ（CI では GITHUB_SHA、手元では git から。取れなければ dev） */
function commitHash(cwd?: string): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

/**
 * アプリの定義をビルドに渡す。
 * - `__APP_VERSION__` と `__APP_COMMIT__`（「このアプリについて」の版）
 * - index.html の `%APP_NAME%`、`%APP_SHORT_NAME%`、`%APP_DESCRIPTION%`、`%APP_LANG%`、`%APP_LOCALE%`、`%SITE_URL%`
 * - version.json（更新の確認で「どの版が来たか」を表示する。オフライン用のキャッシュには入れない）
 */
export function pevenApp(info: AppInfo, o: { version: string; root?: string }): Plugin {
  const app = defineApp(info)
  const commit = commitHash(o.root)
  // OGP は絶対 URL が要る。CI から SITE_URL で指定する
  const site = (process.env.SITE_URL ?? app.site ?? '/').replace(/\/?$/, '/')
  const vars: Record<string, string> = {
    APP_NAME: app.name,
    APP_SHORT_NAME: app.shortName,
    APP_DESCRIPTION: app.description ?? '',
    APP_LANG: app.htmlLang,
    APP_LOCALE: app.ogLocale,
    SITE_URL: site,
  }
  return {
    name: 'pevenmui-app',
    config: () => ({ define: { __APP_VERSION__: JSON.stringify(o.version), __APP_COMMIT__: JSON.stringify(commit) } }),
    transformIndexHtml: (html) => html.replace(/%(APP_\w+|SITE_URL)%/g, (m, k: string) => vars[k] ?? m),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: o.version, commit }) })
    },
  }
}

/** PWA の manifest の名前と言語。`manifest: { ...pevenManifest(APP_INFO), icons: [...] }` のように広げて使う */
export function pevenManifest(info: AppInfo) {
  const app = defineApp(info)
  return { name: app.name, short_name: app.shortName, lang: app.htmlLang, ...(app.description ? { description: app.description } : {}) }
}
