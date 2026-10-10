// PevenMUI（Pitan Seven Material UI）: MUI をもとにした、デスクトップアプリ風の操作感の UI 部品

// ---- アプリの定義 ----
export { defineApp, htmlLangOf, ogLocaleOf, type App, type AppInfo } from './app'
export { AppContext, useApp } from './appContext'

// ---- テーマ、寸法、画面幅 ----
export { PevenProvider, DESKTOP_QUERY, useDesktop, preventPageZoom } from './PevenProvider'
export { createPevenTheme, desktopStyles, LANDSCAPE_PHONE, type PevenThemeOptions } from './theme'
export { PEVEN_TOKENS, pevenFont, pevenTokens, type PevenFontSize, type PevenTokens, type PevenTokensOptions } from './tokens'
export { setUiScale, getUiScale, canvasPixelRatio, localPoint, FULL_HEIGHT, vh, vw } from './uiScale'
export { usePalette } from './hooks/usePalette'

// ---- 多言語化 ----
export { createI18n, type I18n, type I18nOptions } from './i18n'
export { PevenLabels, useLabels, jaLabels, enLabels, koLabels, zhCnLabels, zhTwLabels, type Labels } from './labels'
// 古い API（5 言語に固定）。新しいアプリは createI18n を使う
export { LABELS, LANG_NAMES, HTML_LANG, detectLang, type PevenLang } from './labels'

// ---- メニュー ----
export { default as MenuBar, BAR_TEXT_SX } from './menu/MenuBar'
export { renderEntries, flattenEntries, ContextMenu, type MenuEntry, type MenuGroup } from './menu/MenuList'
export { DrillMenu } from './menu/DrillMenu'

// ---- 画面の配置 ----
export { AppHeader, HeaderIcon, useMobileLayout } from './layout/AppHeader'
export { OverflowRow } from './layout/OverflowRow'
export { StatusBar, StatusItem, StatusButton, StatusSpacer } from './layout/StatusBar'
export { BottomBar } from './layout/BottomBar'
export { DesktopLayout } from './layout/DesktopLayout'
export { MobileLayout, type MobileTab } from './layout/MobileLayout'
export { usePersistentNumber, usePanelWidth } from './layout/Splitter'

// ---- 設定 ----
export { SettingsDialog, matchCategories, type SettingsCategory } from './settings/SettingsDialog'
export { NarrowContext, Group, Row, Choice, Check } from './settings/controls'
export { settingItems, searchKeys, collectItems, type Item, type AnyItem, type ItemGroup, type ValueOf, type ItemsOf, type SettingsOf } from './settings/items'
export { SettingRow } from './settings/SettingRow'
export { NumberInput } from './settings/NumberInput'
export { createSettingsStore } from './settings/store'
export { useNumberDraft } from './hooks/useNumberDraft'
export { SearchContext, matches, useHighlight, useHighlighter } from './settings/search'

// ---- キーボードショートカット ----
export { KeymapEditor } from './keymap/KeymapEditor'
export { ShortcutsDialog } from './keymap/ShortcutsDialog'
export { useShortcuts, type ShortcutHandlers } from './keymap/useShortcuts'
export { resolveKeymap, actionKeys, comboOf, actionOf, comboLabel, keyLabelOf, keymapRows, type KeyAction, type Keymap, type KeymapOverrides, type DefaultKeys } from './keymap/keymap'

// ---- ダイアログ、別ウィンドウ ----
export { useConfirm, type ConfirmRequest } from './dialog/ConfirmDialog'
export { enterToSubmit } from './dialog/enterToSubmit'
export { AboutDialog } from './dialog/AboutDialog'
export { LicensesDialog, type LicenseEntry } from './dialog/LicensesDialog'
export { WindowPortal, autoWindowMode, type WindowMode } from './window/WindowPortal'
export { WindowDialog, WindowModeContext } from './window/WindowDialog'

// ---- ファイル、処理の進み具合、そのほか ----
export { useFileDrop, useFilesDrop } from './hooks/useFileDrop'
export { useFilePicker, useFilesPicker } from './hooks/useFilePicker'
export { useRecentFiles } from './hooks/useRecentFiles'
export { useLeaveGuard } from './hooks/useLeaveGuard'
export { useStableFn } from './hooks/useStableFn'
export { useJobQueue, type JobItem, type JobPersist, type JobQueueOptions, type JobStatus } from './hooks/useJobQueue'
export { useJobs, startJob, type Job } from './progress/jobs'
export { JobGauge } from './progress/JobGauge'

// ---- 追加機能 ----
export { createAddons, addonSize, addonsSupported, type Addons, type AddonsOptions, type AddonInfo, type AddonManifest, type AddonFile } from './addons/store'
export { addonFolderSupported, type AddonFolder } from './addons/folder'
export { AddonsContext, useAddons, type AddonsContextValue } from './addons/context'
export { useAddonInstall } from './addons/AddonInstallDialog'
export { AddonSection } from './addons/AddonSection'
export { AddonFolderRow } from './addons/AddonFolderRow'
export { useDownload, useDownloadingIds, isDownloading, cancelDownload, type Download } from './addons/downloads'

// 時間の表示
export { formatTime, parseTime } from './time/time'
export { useLivePosition } from './time/useLivePosition'
export { default as LiveTime } from './time/LiveTime'
export { SmallButton, ToolbarDivider } from './layout/ToolbarButton'
export { TempoField, type TempoCandidate, type TempoFieldLabels, type TempoFieldProps } from './time/TempoField'
export { SliderResetContext, useDoubleClickReset } from './settings/sliderReset'
export { InlineEdit } from './time/InlineEdit'
export { useLongPress, useDoubleTap, LONG_PRESS_MS, LONG_PRESS_SLOP_PX } from './hooks/useLongPress'
export { useDialogs, type Dialogs } from './dialog/useDialogs'
export { DataRow, DangerButton, DataHeading, DataText } from './settings/DataRow'
export { EmptyState } from './layout/EmptyState'
export { WindowLimitScreen } from './layout/WindowLimitScreen'
