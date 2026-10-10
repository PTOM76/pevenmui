// 何も開いていないときの画面（開くボタン、ほかの始め方、最近使用したファイル。アプリで共通。文字はアプリが訳して渡す）
import { useState, type ReactNode } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faClockRotateLeft, faFileArrowUp } from '@fortawesome/free-solid-svg-icons'
import { pevenFont } from '../tokens'
import { vw } from '../uiScale'

/** 最近使用したファイルを最初に見せる数（残りは「もっと見る」で出す） */
const RECENT_SHOWN = 3

type Action = { label: string; icon: IconDefinition; onClick: () => void }

/** ファイルを開く前の画面。`primary` は大きなボタン、`actions` はその下の小さなボタン */
export function EmptyState(p: {
  message: ReactNode
  primary: Action
  actions?: Action[]
  /** 最近使用したファイル（1 つもなければ出さない）。more と less は「もっと見る」「閉じる」の文字 */
  recent?: { title: string; names: string[]; open: (i: number) => void; more: (n: number) => string; less: string }
}) {
  const [showAll, setShowAll] = useState(false)
  const names = p.recent?.names ?? []
  const shown = showAll ? names : names.slice(0, RECENT_SHOWN)
  return (
    <Stack spacing={2} sx={{ height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Box sx={{ color: 'text.secondary', fontSize: 40 }}>
        <FontAwesomeIcon icon={faFileArrowUp} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {p.message}
      </Typography>
      <Button variant="contained" startIcon={<FontAwesomeIcon icon={p.primary.icon} />} onClick={p.primary.onClick}>
        {p.primary.label}
      </Button>
      {p.actions?.map((a) => (
        <Button key={a.label} variant="text" size="small" startIcon={<FontAwesomeIcon icon={a.icon} />} onClick={a.onClick}>
          {a.label}
        </Button>
      ))}
      {p.recent && names.length > 0 && (
        <Stack spacing={0.25} sx={{ pt: 1, alignItems: 'center', maxWidth: `min(360px, ${vw(90)})`, width: '100%' }}>
          <Typography variant="caption" color="text.secondary">
            {p.recent.title}
          </Typography>
          {shown.map((name, i) => (
            <Button
              key={`${i}-${name}`}
              size="small"
              color="inherit"
              startIcon={<FontAwesomeIcon icon={faClockRotateLeft} fontSize={12} />}
              onClick={() => p.recent?.open(i)}
              title={name}
              sx={{ maxWidth: '100%', justifyContent: 'flex-start', textTransform: 'none', fontWeight: 400 }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </Box>
            </Button>
          ))}
          {names.length > RECENT_SHOWN && (
            <Button size="small" variant="text" onClick={() => setShowAll((v) => !v)} sx={{ fontSize: pevenFont('md') }}>
              {showAll ? p.recent.less : p.recent.more(names.length - RECENT_SHOWN)}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  )
}
