import { useState } from 'react'
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import { Row } from '../settings/controls'
import { fill, useLabels } from '../labels'
import { actionKeys, comboLabel, comboOf, resolveKeymap, type DefaultKeys, type KeyAction, type KeymapOverrides } from './keymap'

interface Props<Id extends string> {
  /** 操作の一覧（設定の画面に表示する順） */
  actions: readonly KeyAction<Id>[]
  overrides: KeymapOverrides<Id>
  /** 既定のキー（省略すると `actions` の `keys`） */
  defaults?: DefaultKeys<Id>
  onChange: (overrides: KeymapOverrides<Id>) => void
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((k, i) => k === b[i])

/**
 * キーボードショートカットの割り当ての画面（設定のダイアログの中に置く）。ボタンを押してから、割り当てるキーを押す（Esc でやめる）。
 * ほかの操作で使っているキーを割り当てたら、そちらからは外す
 */
export function KeymapEditor<Id extends string>({ actions, overrides, defaults = actionKeys(actions), onChange }: Props<Id>) {
  const l = useLabels()
  const [capturing, setCapturing] = useState<Id | null>(null)
  const [message, setMessage] = useState('')
  const resolved = resolveKeymap(actions, overrides, defaults)

  // 既定と同じになったら、保存から外す（既定を後から変えても、新しい既定になるように）
  const put = (next: KeymapOverrides<Id>, id: Id, keys: string[]) => {
    if (same(keys, defaults(id))) delete next[id]
    else next[id] = keys
  }

  const assign = (id: Id, combo: string) => {
    const next = { ...overrides }
    const taken: string[] = []
    for (const a of actions) {
      if (a.id === id || !resolved[a.id].includes(combo)) continue
      put(next, a.id, resolved[a.id].filter((k) => k !== combo))
      taken.push(a.label)
    }
    put(next, id, [combo])
    onChange(next)
    setMessage(taken.length ? fill(l.keyTaken, { key: comboLabel(combo), names: taken.join(l.keyNameSep) }) : '')
  }

  return (
    <>
      {actions.map((a) => {
        const keys = resolved[a.id]
        const changed = !same(keys, defaults(a.id))
        const on = capturing === a.id
        return (
          <Row key={a.id} label={a.label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant={on ? 'contained' : 'outlined'}
                sx={{ minWidth: 120, textTransform: 'none', fontFamily: on ? undefined : 'monospace' }}
                onClick={() => setCapturing(on ? null : a.id)}
                onBlur={() => on && setCapturing(null)}
                onKeyDown={(e) => {
                  if (!on) return
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) return setCapturing(null)
                  const combo = comboOf(e)
                  if (!combo) return
                  assign(a.id, combo)
                  setCapturing(null)
                }}
              >
                {on ? l.keyPress : keys.length ? keys.map(comboLabel).join(' / ') : l.keyNone}
              </Button>
              <Tooltip title={l.keyClear}>
                <span>
                  <IconButton size="small" aria-label={l.keyClear} disabled={!keys.length} onClick={() => {
                    const next = { ...overrides }
                    put(next, a.id, [])
                    onChange(next)
                  }}>
                    ×
                  </IconButton>
                </span>
              </Tooltip>
              {changed && (
                <Button size="small" onClick={() => {
                  const next = { ...overrides }
                  delete next[a.id]
                  onChange(next)
                }}>
                  {l.keyDefault}
                </Button>
              )}
            </Box>
          </Row>
        )
      })}
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button size="small" disabled={!Object.keys(overrides).length} onClick={() => (onChange({}), setMessage(''))}>
          {l.keyResetAll}
        </Button>
        {message && <Typography className="selectable" sx={{ fontSize: 12, color: 'primary.main' }}>{message}</Typography>}
      </Box>
    </>
  )
}
