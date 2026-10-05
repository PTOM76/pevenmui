# PevenMUI

Pitan Seven Material UI — [MUI](https://mui.com/) をもとにした、ブラウザで動くツール向けの UI 部品集。
PC では Windows のデスクトップアプリ、スマホでは Android のアプリに近い操作感にする。

## 含まれるもの

| 部品 | 内容 |
| --- | --- |
| `PevenProvider` / `createPevenTheme` | Material Design 寄りのテーマ。PC では開閉アニメーションを短くし、波紋を消してフォーカス枠を出す |
| `MenuBar` / `ContextMenu` / `renderEntries` | Windows と同じ操作感のメニューバー（Alt / F10、← →、ホバーで切り替え）と右クリックメニュー |
| `useConfirm` | `confirm()` の代わりの確認ダイアログ |
| `enterToSubmit` | ダイアログの Enter で主のボタンを押す |
| `usePanelWidth` / `usePersistentNumber` | 幅を変えられる分割バー（幅は localStorage に残る） |
| `Group` / `Row` / `Choice` / `Check` / `NarrowContext` | 設定画面の部品（PC は Windows 風、スマホは Android 風） |
| `SearchContext` / `useHighlight` | 設定の検索で一致した項目に色を付ける |
| `SettingsDialog` | 設定画面の外枠（分類と検索。分類は `parent` でサブアイテムにできる。PC は OK / 適用、スマホはその場で反映） |
| `AppHeader` / `HeaderIcon` | 上部のバー（PC はメニューバー、スマホは ⋮ メニュー） |
| `StatusBar` / `StatusItem` / `StatusButton` / `StatusSpacer` | PC の下の 24px のステータスバーの枠と項目。中身はアプリが並べる |
| `DesktopLayout` / `MobileLayout` | 画面の配置。PC はツールバー / 編集領域＋右のインスペクタ（幅を変えられる） / ステータスバー。スマホは編集領域 / 表示ツール / タブとパネル / 下のバー（横向きでは右の欄をたためる）。幅と固定は `storageKey` で覚える |
| `BottomBar` | スマホの下のバーの枠（安全領域、区切り線、進んでいる処理のゲージ）。中のボタンはアプリが渡す |
| `AboutDialog` | このアプリについて |
| `ShortcutsDialog` / `keymapRows` | ショートカットの一覧（`keymapRows` で今の割り当てから行を作る） |
| `KeymapEditor` / `useShortcuts` / `resolveKeymap` | キーボードショートカットの割り当て。操作の一覧（`KeyAction`）と既定のキーはアプリが渡し、既定から変えたものだけを保存する。`KeymapEditor` は設定のダイアログの中の割り当ての画面、`useShortcuts` は keydown から操作を呼ぶ（入力欄、ダイアログ、メニューの中は扱わない） |
| `useFileDrop` | ページのどこにドロップしてもファイルを受け取る |
| `PevenLabels` / `jaLabels` / `enLabels` | 部品の中の文字（キャンセル・適用など）を日本語・英語で切り替える |
| `useStableFn` | 常に最新の関数を呼ぶ、作り直されない関数（`memo` した部品に渡す） |
| `useLeaveGuard` | 閉じるときにブラウザの確認を表示する |
| `useFilePicker` / `useFilesPicker` / `useRecentFiles` | ファイルを開く画面と、最近使用したファイル（`pevenmui/web` の `fileAccess` を使う） |
| `usePalette` | 今の配色（ライト / ダーク）のパレットを取り出す（Canvas に描くとき） |
| `startJob` / `useJobs` / `JobGauge` | 進んでいる処理の一覧と、それを 1 本にまとめたゲージ（押すと一覧と中止） |
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

## 必要なもの

`react`、`@mui/material`（と `@emotion/*`）、`@fortawesome/react-fontawesome` と `@fortawesome/free-solid-svg-icons`。

## License

MIT
