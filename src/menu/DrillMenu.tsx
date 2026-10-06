import { useState } from 'react'
import { Box, Divider, ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { pevenTokens } from '../tokens'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import type { MenuEntry } from './MenuList'

/**
 * 段階で開くメニューの中身（スマホの ⋮ と、指で操作する画面の右クリックのメニュー）。
 * サブメニューを押すと同じ場所でその中身に入れ替わり、いちばん上の「‹ 名前」で戻る。
 * 全部を 1 本に並べると長くなって探しにくいため（スマホの設定アプリと同じ形）。ショートカットの表記は出さない。
 * MUI の Menu の中に置く（閉じると作り直されるので、開くたびにいちばん上から始まる）
 */
export function DrillMenu({ entries, onClose }: { entries: MenuEntry[]; onClose: () => void }) {
  const [stack, setStack] = useState<{ label: string; entries: MenuEntry[] }[]>([])
  const cur = stack[stack.length - 1]
  const list = cur?.entries ?? entries
  const items = list.map((e, i) =>
    'divider' in e ? (
      <Divider key={i} sx={{ '&&': { my: 0.5 } }} />
    ) : 'submenu' in e ? (
      <MenuItem key={i} disabled={e.disabled} onClick={() => setStack([...stack, { label: e.label, entries: e.submenu }])}>
        <ListItemText>{e.label}</ListItemText>
        <Box component="span" sx={{ ml: 3, fontSize: (t) => pevenTokens(t).menu.arrowSize + 1, opacity: 0.6, display: 'inline-flex' }}>
          <FontAwesomeIcon icon={faChevronRight} />
        </Box>
      </MenuItem>
    ) : (
      <MenuItem
        key={i}
        disabled={e.disabled}
        onClick={() => {
          onClose()
          e.onClick()
        }}
      >
        {e.checked !== undefined && (
          <ListItemIcon sx={{ visibility: e.checked ? 'visible' : 'hidden', fontSize: (t) => pevenTokens(t).menu.checkSize }}>
            <FontAwesomeIcon icon={faCheck} />
          </ListItemIcon>
        )}
        <ListItemText>{e.label}</ListItemText>
      </MenuItem>
    ),
  )
  if (!cur) return items
  // 中に入っているときは、いちばん上に戻るための見出し
  return [
    <MenuItem key="back" onClick={() => setStack(stack.slice(0, -1))} sx={{ fontWeight: 600 }}>
      <ListItemIcon>
        <FontAwesomeIcon icon={faChevronLeft} />
      </ListItemIcon>
      <ListItemText slotProps={{ primary: { sx: { fontWeight: 600 } } }}>{cur.label}</ListItemText>
    </MenuItem>,
    <Divider key="back-divider" sx={{ '&&': { my: 0.5 } }} />,
    ...items,
  ]
}
