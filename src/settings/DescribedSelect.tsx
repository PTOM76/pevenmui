// 選択ボックス。開いた一覧には各項目の説明を付け、閉じているときは名前だけにする
import { ListItemText, MenuItem, TextField } from '@mui/material'

export interface DescribedOption<T extends string> {
  value: T
  label: string
  /** 開いた一覧にだけ出す説明 */
  hint?: string
}

export default function DescribedSelect<T extends string>(p: {
  /** 選んでいるもの。複数が混ざっているときなどは空 */
  value: T | ''
  options: DescribedOption<T>[]
  onChange: (v: T) => void
  /** 省くと枠の上の名前を付けない（設定の行など、名前が別にあるとき） */
  label?: string
}) {
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={p.label}
      value={p.value}
      slotProps={{ select: { renderValue: (v) => p.options.find((o) => o.value === v)?.label ?? '' } }}
      onChange={(e) => p.onChange(e.target.value as T)}
    >
      {p.options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          <ListItemText primary={o.label} secondary={o.hint} />
        </MenuItem>
      ))}
    </TextField>
  )
}
