# PevenMUI

Pitan Seven Material UI — [MUI](https://mui.com/) をもとにした、ブラウザで動くツール向けの UI 部品集。
PC では Windows のデスクトップアプリ、スマホでは Android のアプリに近い操作感にする。

## 含まれるもの

### テーマ、寸法、画面幅

| 部品 | 内容 |
| --- | --- |
| `PevenProvider` / `createPevenTheme` | Material Design 寄りのテーマ。PC では開閉アニメーションを短くし、波紋を消してフォーカス枠を表示する。`i18n` と `lang` を渡すと、アプリの文字と部品の文字をその言語に切り替える |
| `PEVEN_TOKENS` / `pevenTokens` | 部品の寸法（メニュー、上のバー、ステータスバー、設定の分類の幅）。テーマの `peven` で上書きできる |
| `setUiScale` / `FULL_HEIGHT` / `vh` / `vw` | 画面の大きさ（拡大率）と、それに合わせた高さと幅 |
| `usePalette` | 今の配色（ライト / ダーク）のパレットを取り出す（Canvas に描くとき） |

### 多言語化

| 部品 | 内容 |
| --- | --- |
| `createI18n` | アプリの訳文と対応言語を登録し、`t` / `useT` / 言語の判定 / 設定の選択肢を作る |
| `PevenLabels` / `useLabels` | 部品の中の文字（キャンセル、適用など）。PevenMUI は日本語、英語、韓国語、簡体字、繁体字の訳を持つ |
| `LABELS` / `LANG_NAMES` / `HTML_LANG` / `detectLang` / `PevenLang` | 古い API（5 言語に固定）。新しいアプリは `createI18n` を使用する |

### メニュー

| 部品 | 内容 |
| --- | --- |
| `MenuBar` / `ContextMenu` / `renderEntries` | Windows と同じ操作感のメニューバー（Alt / F10、← →、ホバーで切り替え）と右クリックメニュー |
| `DrillMenu` | スマホのメニュー（サブメニューを段階で開く） |

### 画面の配置

| 部品 | 内容 |
| --- | --- |
| `AppHeader` / `HeaderIcon` | 上部のバー（PC はメニューバー、スマホは ⋮ メニュー） |
| `StatusBar` / `StatusItem` / `StatusButton` / `StatusSpacer` | PC の下のステータスバーの枠と項目。中身はアプリが並べる |
| `DesktopLayout` / `MobileLayout` | 画面の配置。PC はツールバー / 編集領域＋右のインスペクタ（幅を変えられる） / ステータスバー。スマホは編集領域 / 表示ツール / タブとパネル / 下のバー（横向きでは右の欄をたためる）。幅と固定は `storageKey` で覚える |
| `BottomBar` | スマホの下のバーの枠（安全領域、区切り線、進んでいる処理のゲージ）。中のボタンはアプリが渡す |
| `OverflowRow` | 入りきらないボタンを「ほかのボタン」にまとめる行 |
| `usePanelWidth` / `usePersistentNumber` | 幅を変えられる分割バー（幅は localStorage に残る） |

### 設定

| 部品 | 内容 |
| --- | --- |
| `SettingsDialog` | 設定画面の外枠（分類と検索。分類は `parent` でサブアイテムにできる。PC は OK / 適用、スマホはその場で反映） |
| `Group` / `Row` / `Choice` / `Check` / `NarrowContext` | 設定画面の部品（PC は Windows 風、スマホは Android 風） |
| `SearchContext` / `useHighlight` | 設定の検索で一致した項目に色を付ける |

### キーボードショートカット

| 部品 | 内容 |
| --- | --- |
| `KeymapEditor` / `useShortcuts` / `resolveKeymap` | キーの割り当て。操作の一覧（`KeyAction`）と既定のキーはアプリが渡し、既定から変えたものだけを保存する。`KeymapEditor` は設定のダイアログの中の割り当ての画面、`useShortcuts` は keydown から操作を呼ぶ（入力欄、ダイアログ、メニューの中は扱わない） |
| `ShortcutsDialog` / `keymapRows` | ショートカットの一覧（`keymapRows` で今の割り当てから行を作る） |

### ダイアログ、別ウィンドウ

| 部品 | 内容 |
| --- | --- |
| `useConfirm` | `confirm()` の代わりの確認ダイアログ |
| `enterToSubmit` | ダイアログの Enter で主のボタンを押す |
| `AboutDialog` / `LicensesDialog` | このアプリについて、ライセンス |
| `WindowDialog` / `WindowPortal` | ダイアログを別ウィンドウでも開ける |

### ファイル、処理の進み具合、そのほか

| 部品 | 内容 |
| --- | --- |
| `useFileDrop` | ページのどこにドロップしてもファイルを受け取る |
| `useFilePicker` / `useFilesPicker` / `useRecentFiles` | ファイルを開く画面と、最近使用したファイル（`pevenmui/web` の `fileAccess` を使用する） |
| `startJob` / `useJobs` / `JobGauge` | 進んでいる処理の一覧と、それを 1 本にまとめたゲージ（押すと一覧と中止） |
| `useLeaveGuard` | 閉じるときにブラウザの確認を表示する |
| `useStableFn` | 常に最新の関数を呼ぶ、作り直されない関数（`memo` した部品に渡す） |
| `pevenmui/web` | React を使わない部品。IndexedDB（`createIdb`）、File System Access API（`initFileAccess` / `pickSaveTarget` など）、`isMobile` / `isStandalone`、`downloadBlob`。Worker からも読み込める |
| `pevenmui/pwa` | 新しい版の通知（`UpdatePrompt`）と確認（`UpdateSection`）。vite-plugin-pwa（registerType: 'prompt'）を使うアプリだけが読み込む |

## 使い方

ソースのまま（TypeScript）読み込む前提。Vite などのバンドラーで `pevenmui` を `pevenmui/src/index.ts` に向ける。

```tsx
import { PevenProvider, preventPageZoom } from 'pevenmui'

preventPageZoom()
createRoot(root).render(
  <PevenProvider desktopLook>
    <App />
  </PevenProvider>,
)
```

`pevenmui/web` と `pevenmui/pwa` も同じように、それぞれ `src/web/index.ts` と `src/pwa/index.ts` に向ける。

色などは `theme` に MUI の ThemeOptions を渡して上書きできる。フォント（Roboto）はアプリ側で読み込む。

### 多言語化

対応言語はアプリが決める。訳文は言語ごとの JSON（名前は `ja_jp`、`en_us` の形）にし、`createI18n` に渡す。

```ts
import { createI18n } from 'pevenmui'
import en from './lang/en_us.json'
import ja from './lang/ja_jp.json'

export const i18n = createI18n({
  messages: { en_us: en, ja_jp: ja },
  // base: 'ja_jp',   // キーの正（既定は en_us）。ほかの言語に欠けたキーは型エラー
  // fallback: 'en_us', // 訳がないときと、ブラウザの言語が対応外のとき（既定は base）
})
export const { t, useT } = i18n
export type Lang = typeof i18n.Lang
```

```tsx
const lang = i18n.resolve(setting) // 'auto' はブラウザの言語から選ぶ
<PevenProvider i18n={i18n} lang={lang}>
```

- 設定の言語の選択肢は `i18n.options()`（登録した言語だけ。名前は各言語の自称）
- `<html lang>` は `ja_jp` → `ja` のように自動で書く。`htmlLang` で上書きできる
- 部品の文字は、アプリの言語 → `fallback` → 英語の順に探す。PevenMUI に訳がない言語は `labels` で足す（`labels: { fr_fr: { cancel: 'Annuler', ... } }`）

### 寸法

部品の寸法はテーマの `peven` で変える。一部だけ渡せばよい。

```tsx
<PevenProvider theme={{ peven: { menu: { checkSize: 14 }, statusBar: { height: 28 } } }}>
```

値の一覧と既定値は `src/tokens.ts`。自作の部品からは `sx={{ height: (t) => pevenTokens(t).statusBar.height }}` で読める。

## 必要なもの

`react`、`@mui/material`（と `@emotion/*`）、`@fortawesome/react-fontawesome` と `@fortawesome/free-solid-svg-icons`。

## License

MIT
