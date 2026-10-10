// React や MUI を使わない部品（Worker からも読み込める）
export { createIdb, type Idb } from './idb'
export { defineApp, type App, type AppInfo } from '../app'
export { isMobile, isStandalone } from './env'
export { downloadBlob } from './download'
export {
  configureFileAccess,
  initFileAccess,
  canPickFiles,
  pickSaveTarget,
  overwriteTarget,
  fileRefOf,
  type SavedFile,
  pickOpenFile,
  pickOpenFiles,
  listRecent,
  rememberLaunched,
  rememberDropped,
  clearRecent,
  openRecent,
  onRecentChange,
  type FileAccessOptions,
  type StartFolder,
  type PickerMode,
  type SaveTarget,
  type RecentFile,
} from './fileAccess'
export { canSaveToFolder, chooseSaveFolder, folderFileTarget, saveToFolder, savedFolderName } from './folderSave'
export { createAddons, addonSize, addonsSupported, type Addons, type AddonsOptions, type AddonInfo, type AddonManifest, type AddonFile } from '../addons/store'
export { ADDON_FOLDER_KEY, addonFolderSupported, type AddonFolder } from '../addons/folder'
export { createZip, type ZipEntry } from './zip'
export { storageUsage, clearOfflineCache, clearLocalItems, isPersisted, requestPersist, formatMb } from './storage'
