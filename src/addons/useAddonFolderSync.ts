// 追加機能の保存先のフォルダー（試験的）を使い始める。許可がなければ通知で求め、設定と自動保存した作業もそのフォルダーに写す（WeVocalSynth、WeVocal Studio で共通）
import { useEffect } from 'react'
import type { NoticeMessageData } from '../dialog/NoticeMessage'
import { useLabels, type Labels } from '../labels'
import { startDataFolderSync, type DataFolder } from '../web/dataFolder'
import { useAddons } from './context'

export interface AddonFolderSyncOptions {
  /** 設定の「指定したフォルダーに保存する」 */
  enabled: boolean
  /** 写す先（createDataFolder） */
  dataFolder: DataFolder
  /** 自動保存を写すか（自動保存の Worker に伝える）。`resync` は今ある作業をまとめて写し直すとき */
  setAutosaveFolder: (on: boolean, resync: boolean) => void
  /** 写した設定と作業を戻す（アプリの IndexedDB に書く）。何か戻したら true */
  restore: () => Promise<boolean>
  /** 通知を出す（アプリの通知の欄） */
  notify: (m: NoticeMessageData) => void
  /** 部品の文字（PevenLabels の Provider より外で呼ぶとき） */
  labels?: Labels
}

/** 設定がオンの間、追加機能の保存先をフォルダーにし、設定と自動保存した作業も写す */
export function useAddonFolderSync(o: AddonFolderSyncOptions) {
  const fallback = useLabels()
  const l = o.labels ?? fallback
  const { addons } = useAddons()
  // 開いたときに許可がなければ、通知から許可してもらう（Service Worker からは求められない）
  useEffect(() => {
    addons.folder.setEnabled(o.enabled)
    if (!o.enabled) return
    const allow = () => void addons.folder.requestPermission().then((ok) => ok && addons.notifyAddonsChanged())
    void addons.folder.permission().then((p) => p === 'prompt' && o.notify({ severity: 'info', message: l.addonFolderPermission, actions: [{ label: l.addonFolderAllow, onClick: allow }] }))
    // 設定を変えたときと、開いたときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.enabled])
  // 設定と自動保存した作業も写す（PWA を消しても戻せるように）
  useEffect(() => {
    if (!o.enabled) return o.setAutosaveFolder(false, false)
    return startDataFolderSync(o.dataFolder, {
      onLinked: o.setAutosaveFolder,
      // ほかのブラウザ（入れ直す前など）の写しがあれば、戻すか上書きするかを聞く
      onOther: (restore, overwrite) =>
        o.notify({
          severity: 'info',
          message: l.dataFolderFound,
          actions: [
            { label: l.dataFolderRestore, onClick: restore },
            { label: l.dataFolderOverwrite, onClick: overwrite },
          ],
        }),
      restore: () => void o.restore().then((ok) => ok && location.reload()),
      onChanged: addons.onAddonsChanged,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.enabled])
}
