import type { ReactNode } from 'react'
import { Box, ButtonBase, Stack, Tooltip, type SxProps, type Theme } from '@mui/material'

const ITEM_SX = { px: 1, height: '100%', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', lineHeight: 'inherit' } as const

/**
 * PC 用のステータスバー（高さ 24px）の枠。常に見えていてほしいが、場所は取りたくない情報を並べる。
 * 中身は `StatusItem`、`StatusButton`、`StatusSpacer` などをアプリが並べる
 */
export function StatusBar({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      // 行の高さを固定し、英字と日本語のフォントが混ざっても文字の高さがそろうようにする
      sx={{ height: 24, lineHeight: '23px', fontSize: 12, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', alignItems: 'center' }}
    >
      {children}
    </Stack>
  )
}

/** ステータスバーの項目（文字）。`secondary` なら薄い色 */
export function StatusItem({ children, secondary, sx }: { children: ReactNode; secondary?: boolean; sx?: SxProps<Theme> }) {
  return <Box sx={[ITEM_SX, secondary ? { color: 'text.secondary' } : {}, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>
}

/** ステータスバーの押せる項目（長い文字は … で切る） */
export function StatusButton({ children, title, disabled, onClick, maxWidth = 280 }: { children: ReactNode; title?: string; disabled?: boolean; onClick?: () => void; maxWidth?: number }) {
  const button = (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{ ...ITEM_SX, maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontFamily: 'inherit', fontSize: 12, '&:hover': { bgcolor: 'action.hover' } }}
    >
      {children}
    </ButtonBase>
  )
  return title ? <Tooltip title={title}>{button}</Tooltip> : button
}

/** 残りの幅を空ける（これより後ろの項目を右端に寄せる） */
export const StatusSpacer = () => <Box sx={{ flexGrow: 1 }} />
