// 開いている文書（プロジェクト）のタブの帯。選んで切り替え、× で閉じ、+ で足す。保存していない文書には印を付ける。中ボタンのクリックでも閉じる。ドラッグで並びを入れ替える
import { useState } from 'react'
import { Box, ButtonBase, IconButton, Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'

export interface DocumentTab {
  id: string
  title: string
  /** 保存していない変更があるか */
  dirty?: boolean
}

export function DocumentTabs(p: { tabs: DocumentTab[]; activeId: string; onSelect: (id: string) => void; onClose: (id: string) => void; onAdd?: () => void; /** 並びを入れ替える（from のタブを、to のタブの位置へ） */ onMove?: (from: string, to: string) => void; labels: { close: string; add: string } }) {
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  return (
    <Box role="tablist" sx={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, height: 30, overflowX: 'auto', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      {p.tabs.map((tab) => {
        const active = tab.id === p.activeId
        return (
          <Box
            key={tab.id}
            role="tab"
            aria-selected={active}
            // 中ボタンの押下は自動スクロールを始めるので止める
            onMouseDown={(e) => e.button === 1 && e.preventDefault()}
            onAuxClick={(e) => {
              if (e.button !== 1) return
              e.preventDefault()
              p.onClose(tab.id)
            }}
            draggable={!!p.onMove}
            onDragStart={(e) => {
              setDrag(tab.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              if (!drag || drag === tab.id) return
              e.preventDefault()
              setOver(tab.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (drag && drag !== tab.id) p.onMove?.(drag, tab.id)
              setDrag(null)
              setOver(null)
            }}
            onDragEnd={() => {
              setDrag(null)
              setOver(null)
            }}
            sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, maxWidth: 220, borderRight: 1, borderBottom: 2, borderColor: 'divider', borderBottomColor: active ? 'primary.main' : 'transparent', bgcolor: active ? 'action.selected' : 'transparent', opacity: drag === tab.id ? 0.5 : 1, borderLeft: 2, borderLeftColor: over === tab.id ? 'primary.main' : 'transparent' }}
          >
            <ButtonBase onClick={() => p.onSelect(tab.id)} sx={{ px: 1.25, height: '100%', fontSize: 13, minWidth: 0, opacity: active ? 1 : 0.7 }}>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tab.title}
                {tab.dirty ? ' *' : ''}
              </Box>
            </ButtonBase>
            <Tooltip title={p.labels.close}>
              <IconButton size="small" aria-label={p.labels.close} onClick={() => p.onClose(tab.id)} sx={{ p: 0.5, mr: 0.25 }}>
                <FontAwesomeIcon icon={faXmark} size="xs" />
              </IconButton>
            </Tooltip>
          </Box>
        )
      })}
      {p.onAdd && (
        <Tooltip title={p.labels.add}>
          <IconButton size="small" aria-label={p.labels.add} onClick={p.onAdd} sx={{ alignSelf: 'center', mx: 0.5 }}>
            <FontAwesomeIcon icon={faPlus} size="xs" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
