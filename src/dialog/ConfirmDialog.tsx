import { useRef, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material'

export interface ConfirmRequest {
  message: string
  /** 実行するボタンの文字（「削除」など） */
  okLabel: string
  /** 取り消せない操作なら赤いボタンにする */
  danger?: boolean
}

/**
 * 確認ダイアログ（ブラウザの confirm の代わり）。`confirm(...)` で開き、実行なら true を返す。
 * 返す `dialog` を画面のどこかに置く。`cancelLabel` はキャンセルボタンの文字（翻訳はアプリ側で行う）
 */
export function useConfirm(cancelLabel: string) {
  const [req, setReq] = useState<ConfirmRequest | null>(null)
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const confirm = (r: ConfirmRequest) =>
    new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setReq(r)
    })
  const close = (ok: boolean) => {
    resolveRef.current?.(ok)
    resolveRef.current = null
    setReq(null)
  }

  const dialog = (
    <Dialog open={!!req} onClose={() => close(false)} fullWidth maxWidth="xs">
      <DialogContent>
        <Typography className="selectable" sx={{ fontSize: 14 }}>
          {req?.message}
        </Typography>
      </DialogContent>
      <DialogActions>
        {/* 誤って実行しないよう、最初はキャンセルにフォーカスを置く */}
        <Button size="small" autoFocus onClick={() => close(false)}>
          {cancelLabel}
        </Button>
        <Button size="small" color={req?.danger ? 'error' : 'primary'} onClick={() => close(true)}>
          {req?.okLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )

  return { confirm, dialog }
}
