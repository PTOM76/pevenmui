// 選んだものに掛ける編集のボタンの列（アイコンと短い名前。入りきらなければ横にスクロールする。スマホで選んだときに画面の下に出す）
import type { ReactNode } from 'react'
import { Box, ButtonBase, Typography } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { pevenFont } from '../tokens'

/** 編集バーを出す設定（auto はスマホとタブレットだけ） */
export type EditBarSetting = 'auto' | 'on' | 'off'

/** 設定と、タッチの端末かどうかから、編集バーを出すか */
export const editBarEnabled = (setting: EditBarSetting, touch: boolean) => setting === 'on' || (setting === 'auto' && touch)

/** 区切り線 */
export const EDIT_BAR_DIVIDER = 'divider'

export interface EditBarItem {
  /** ボタンの下に出す名前（アプリが訳す） */
  label: string
  icon: IconDefinition
  onClick: (e: React.MouseEvent<HTMLElement>) => void
  disabled?: boolean
}

/** ボタンの列。EDIT_BAR_DIVIDER を入れると区切り線になる。children は列の最後に足す。top は画面の上に置くとき（境界の線を下に引く） */
export function EditBar(p: { items: (EditBarItem | typeof EDIT_BAR_DIVIDER)[]; children?: ReactNode; top?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 0.25, px: 0.5, py: 0.25, [p.top ? 'borderBottom' : 'borderTop']: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
      {p.items.map((it, i) =>
        it === EDIT_BAR_DIVIDER ? (
          <Box key={`d${i}`} sx={{ width: '1px', alignSelf: 'stretch', my: 0.75, bgcolor: 'divider', flexShrink: 0 }} />
        ) : (
          <ButtonBase
            key={it.label}
            disabled={it.disabled}
            onClick={it.onClick}
            sx={{ flexDirection: 'column', gap: 0.25, minWidth: 56, height: 44, px: 0.5, borderRadius: 1, color: 'text.primary', opacity: it.disabled ? 0.4 : 1, flexShrink: 0 }}
          >
            <FontAwesomeIcon icon={it.icon} fontSize={15} />
            <Typography sx={{ fontSize: pevenFont('xs'), lineHeight: 1, whiteSpace: 'nowrap' }}>{it.label}</Typography>
          </ButtonBase>
        ),
      )}
      {p.children}
    </Box>
  )
}
