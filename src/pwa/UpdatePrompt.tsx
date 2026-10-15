import { useEffect, useState } from 'react'
import { startJob } from '../progress/jobs'
import { NoticeMessage, type NoticeCorner } from '../dialog/NoticeMessage'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { fill, useLabels } from '../labels'
import { fetchLatestBuild, isNewer, setAppBuild, setDevUpdates, setRegistration, setShowPrompt, updateNow } from './updateCheck'

/** 開いたままでも新しい版に気づけるよう、更新を確認する間隔（ミリ秒） */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * 新しい版が公開されたときの通知（vite-plugin-pwa の registerType: 'prompt' で使う）。
 * 勝手に入れ替えると作業中に再読み込みされるため、利用者が「更新」を押したときだけ切り替える。
 * メニューの「更新を確認」で見つけたときも、この通知を出す（promptUpdate）。
 * `build` は今動いている版（formatBuild で作る）。`devUpdates` なら、バージョンが同じでコミットだけ違う版（開発版）も知らせる
 */
export function UpdatePrompt({ build, devUpdates = false, ...corner }: { build: string; devUpdates?: boolean } & NoticeCorner) {
  const l = useLabels()
  setAppBuild(build)
  setDevUpdates(devUpdates)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setRegistration(registration)
      const check = () => void registration.update().catch(() => {})
      setInterval(check, CHECK_INTERVAL_MS)
      // iPad などのホーム画面の PWA は、開き直しても読み込み直さず続きから表示されることが多く、
      // 裏にいる間はタイマーも止まる。画面に戻ってきたときにも確認する
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  // 新しい Service Worker が来たら、どの版かを取りに行く（バージョン番号が同じでもコミットで見分けられる）。
  // 取り終わるまでは通知を出さない（undefined は取得中、null は取れなかった）
  const [latest, setLatest] = useState<string | null | undefined>(undefined)
  // メニューの「更新を確認」で見つけたとき（まだダウンロードしていなくても出す）
  const [asked, setAsked] = useState(false)
  useEffect(
    () =>
      setShowPrompt((b) => {
        setLatest(b)
        setAsked(true)
      }),
    [],
  )
  useEffect(() => {
    if (!needRefresh || asked) return
    setLatest(undefined)
    void fetchLatestBuild().then(setLatest)
  }, [needRefresh, asked])
  // 配信中の版が今動いている版と同じ（開発版を受け取らないならバージョンが同じ）なら通知しない。再読み込みで新しい画面だけ先に読み込んだときなどに、
  // 古い Service Worker の入れ替えだけが残っていることがあり、そのまま通知すると「1.0.5 → 1.0.5」になる
  const open = (needRefresh || asked) && latest !== undefined && (latest === null || isNewer(latest, build))

  const [updating, setUpdating] = useState(false)
  const [notYet, setNotYet] = useState(false)
  const update = async () => {
    // 通知は閉じ、進み具合は処理のゲージに出す（割合は分からない）。入れ替えられたら読み込み直すので、ゲージはそのまま消える
    setUpdating(true)
    setNotYet(false)
    const job = startJob('update', l.updating)
    job.update(-1)
    const ok = await updateNow()
    if (!ok) {
      job.end()
      setUpdating(false)
      setNotYet(true)
    }
  }
  const close = () => {
    setNeedRefresh(false)
    setAsked(false)
  }

  return (
    <NoticeMessage
      horizontal="right"
      {...corner}
      autoHideMs={null}
      onClose={close}
      message={
        open && !updating
          ? {
              severity: notYet ? 'warning' : 'info',
              message: (
                <>
                  {notYet ? l.updateNotYet : l.updateAvailable}
                  {!notYet && latest && fill(l.updateAvailableBuild, { from: build, to: latest })}
                </>
              ),
              // 押すと通知は閉じ、更新中はゲージに出す（更新できなかったときは「まだ」と出し直す）
              actions: [{ label: l.updateReload, onClick: () => void update() }],
            }
          : null
      }
    />
  )
}
