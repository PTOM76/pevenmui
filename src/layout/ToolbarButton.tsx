// ツールバーの小さなアイコンボタンと区切り線（アプリで共通）
import { Divider, IconButton, Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

/** ツールチップ付きの小さいアイコンボタン。`pressed` を渡すと ON/OFF の切替ボタンになる */
export function SmallButton(props: { title: string; label: string; icon: IconDefinition; pressed?: boolean; disabled?: boolean; color?: 'primary' | 'error'; onClick: () => void }) {
  return (
    <Tooltip title={props.title}>
      <span>
        <IconButton aria-label={props.label} aria-pressed={props.pressed} size="small" color={props.pressed ? (props.color ?? 'primary') : 'default'} disabled={props.disabled} onClick={props.onClick}>
          <FontAwesomeIcon icon={props.icon} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

/**
 * ツールバーの操作のまとまりの区切り線。上下は空けず、置いた列の高さいっぱいに伸ばす。
 * `gap` なら左右にすき間を付ける（ツールバーの Stack の spacing と同じ幅）
 */
export function ToolbarDivider({ gap = false }: { gap?: boolean }) {
  return <Divider orientation="vertical" flexItem sx={{ mx: gap ? 0.5 : 0 }} />
}
