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
| `SettingsDialog` | 設定画面の外枠（分類・検索。PC は OK / 適用、スマホはその場で反映） |
| `AppHeader` / `HeaderIcon` | 上部のバー（PC はメニューバー、スマホは ⋮ メニュー） |
| `AboutDialog` / `ShortcutsDialog` | このアプリについて、ショートカット一覧 |
| `useFileDrop` | ページのどこにドロップしてもファイルを受け取る |
| `PevenLabels` / `jaLabels` / `enLabels` | 部品の中の文字（キャンセル・適用など）を日本語・英語で切り替える |
| `useStableFn` | 常に最新の関数を呼ぶ、作り直されない関数（`memo` した部品に渡す） |
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

色などは `theme` に MUI の ThemeOptions を渡して上書きできる。フォント（Roboto）はアプリ側で読み込む。

## 必要なもの

`react`、`@mui/material`（と `@emotion/*`）、`@fortawesome/react-fontawesome` と `@fortawesome/free-solid-svg-icons`。

## License

MIT
