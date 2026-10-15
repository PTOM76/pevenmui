// 画面の隅に出す通知（メッセージと、押せるボタン。時間が来るか、閉じるボタンで消える）。文字は選択してコピーできる
import { Alert, Button, IconButton, Snackbar, type AlertColor } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useLabels } from '../labels'

export interface NoticeMessageData {
  severity: AlertColor
  message: string
  /** 通知の中のボタン。押すと通知を閉じてから実行する */
  actions?: { label: string; onClick: () => void }[]
}

/**
 * 通知。色は MUI の標準の Alert（ライトは淡い地、ダークは暗い地に色を重ねる）。
 * `top` なら上に出す（スマホで下の再生バーを隠さないため）。ボタンのある通知は押す間があるよう長めに出す
 */
export function NoticeMessage(p: { message: NoticeMessageData | null; onClose: () => void; top?: boolean; autoHideMs?: number }) {
  const l = useLabels()
  const t = p.message
  const close = (
    <IconButton color="inherit" size="small" aria-label={l.close} title={l.close} onClick={p.onClose}>
      <FontAwesomeIcon icon={faXmark} />
    </IconButton>
  )
  return (
    <Snackbar
      anchorOrigin={p.top ? { vertical: 'top', horizontal: 'center' } : undefined}
      open={!!t}
      autoHideDuration={p.autoHideMs ?? (t?.actions ? 10000 : 4000)}
      onClose={(_, reason) => reason !== 'clickaway' && p.onClose()}
    >
      {t ? (
        <Alert
          severity={t.severity}
          // action を渡すと Alert の閉じるボタンが出なくなるので、ボタンの横に自分で置く
          action={
            <>
              {t.actions?.map((a) => (
                <Button key={a.label} color="inherit" size="small" onClick={() => (p.onClose(), a.onClick())}>
                  {a.label}
                </Button>
              ))}
              {close}
            </>
          }
        >
          <span className="selectable">{t.message}</span>
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
