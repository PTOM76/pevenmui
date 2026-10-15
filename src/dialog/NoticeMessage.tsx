// 画面の隅に出す通知（メッセージと、押せるボタン。時間が来るか、閉じるボタンで消える）。文字は選択してコピーできる
import { useRef, type ReactNode } from 'react'
import { Alert, Button, IconButton, Snackbar, type AlertColor } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useLabels } from '../labels'

export interface NoticeMessageData {
  severity: AlertColor
  message: ReactNode
  /** 通知の中のボタン。押すと通知を閉じてから実行する（keepOpen なら閉じない） */
  actions?: { label: ReactNode; onClick: () => void; disabled?: boolean; keepOpen?: boolean }[]
}

/** 通知を出す隅 */
export interface NoticeCorner {
  /** 既定は下。スマホは下の再生バーを隠さないよう上にする */
  vertical?: 'top' | 'bottom'
  /** 既定は左 */
  horizontal?: 'left' | 'center' | 'right'
}

/**
 * 通知。色は MUI の標準の Alert（ライトは淡い地、ダークは暗い地に色を重ねる）。
 * ボタンのある通知は押す間があるよう長めに出す。`autoHideMs` に null を渡すと、閉じるまで出し続ける
 */
export function NoticeMessage(p: NoticeCorner & { message: NoticeMessageData | null; onClose: () => void; autoHideMs?: number | null }) {
  const l = useLabels()
  // 閉じるアニメーションの間も中身を残す（先に消えて空の枠だけが残らないように）
  const last = useRef(p.message)
  if (p.message) last.current = p.message
  const t = p.message ?? last.current
  return (
    <Snackbar
      anchorOrigin={{ vertical: p.vertical ?? 'bottom', horizontal: p.horizontal ?? 'left' }}
      open={!!p.message}
      autoHideDuration={p.autoHideMs === undefined ? (t?.actions ? 10000 : 4000) : p.autoHideMs}
      // 外を押しても閉じない（Esc では閉じる）
      onClose={(_, reason) => reason !== 'clickaway' && p.onClose()}
    >
      {t ? (
        <Alert
          severity={t.severity}
          // action を渡すと Alert の閉じるボタンが出なくなるので、ボタンの横に自分で置く
          action={
            <>
              {t.actions?.map((a, i) => (
                <Button key={i} color="inherit" size="small" disabled={a.disabled} onClick={() => (a.keepOpen || p.onClose(), a.onClick())}>
                  {a.label}
                </Button>
              ))}
              <IconButton color="inherit" size="small" aria-label={l.close} title={l.close} onClick={p.onClose}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </>
          }
        >
          <span className="selectable">{t.message}</span>
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
