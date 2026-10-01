import { useState, type ReactNode } from 'react'
import { AppBar, Box, IconButton, ListSubheader, Menu, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useLabels } from '../labels'
import MenuBar from '../menu/MenuBar'
import { renderEntries, type MenuGroup } from '../menu/MenuList'
import { LANDSCAPE_PHONE } from '../theme'

/** 上部のバーに置くアイコンボタン（無効時もツールチップを出すため span で包む）。PC では `small` にする */
export function HeaderIcon(p: { title: string; icon: IconDefinition; disabled?: boolean; small?: boolean; onClick: () => void }) {
  return (
    <Tooltip title={p.title}>
      <span>
        <IconButton aria-label={p.title} size={p.small ? 'small' : 'medium'} disabled={p.disabled} onClick={p.onClick}>
          <FontAwesomeIcon icon={p.icon} fontSize={p.small ? 13 : undefined} />
        </IconButton>
      </span>
    </Tooltip>
  )
}

/** スマホ: Android の上部バーにある ⋮（その他）メニュー */
function OverflowMenu({ menus }: { menus: MenuGroup[] }) {
  const l = useLabels()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const close = () => setAnchor(null)
  return (
    <>
      <IconButton aria-label={l.menu} edge="end" onClick={(e) => setAnchor(e.currentTarget)}>
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, maxHeight: '80vh' } } }}
      >
        {menus.flatMap((m): ReactNode[] => [
          <ListSubheader key={`h-${m.label}`} sx={{ lineHeight: '32px' }}>
            {m.label}
          </ListSubheader>,
          // スマホではショートカット表記は出さない
          ...renderEntries(
            m.entries.map((e) => ('divider' in e ? e : { ...e, shortcut: undefined })),
            close,
            `${m.label}-`,
          ),
        ])}
      </Menu>
    </>
  )
}

/** 画面幅と向きから、スマホの配置にするか（大きめのスマホの横向きは幅が md を超えるので、横向きのスマホもスマホにする） */
export function useMobileLayout() {
  const theme = useTheme()
  return useMediaQuery(`${theme.breakpoints.down('md').replace('@media ', '')}, ${LANDSCAPE_PHONE}`)
}

/**
 * 上部のバー。PC は Windows 風の低いメニューバー、スマホは Android 風の上部バー（メニューは ⋮ にまとめる）。
 * `actions` は右端に並べるもの。PC とスマホでボタンの大きさを変えるため、スマホかどうかを受け取って返す
 */
export function AppHeader(p: { title: string; icon: ReactNode; menus: MenuGroup[]; actions?: (mobile: boolean) => ReactNode }) {
  const mobile = useMobileLayout()
  const standalone = useMediaQuery('(display-mode: standalone), (display-mode: window-controls-overlay)')
  const landscape = useMediaQuery(LANDSCAPE_PHONE)

  if (mobile) {
    return (
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {/* 横向きは高さが足りないので低くする */}
        <Toolbar sx={{ minHeight: `${landscape ? 44 : 56}px !important`, gap: 0.5 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: landscape ? 18 : 22, fontWeight: 400 }} noWrap>
            {p.title}
          </Typography>
          {p.actions?.(true)}
          <OverflowMenu menus={p.menus} />
        </Toolbar>
      </AppBar>
    )
  }

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar disableGutters sx={{ minHeight: '32px !important', height: 32, px: 1, gap: 0.25 }}>
        {/* PWA としてインストールして開いたときは、ウィンドウのタイトルバーにアイコンが出るので出さない */}
        {!standalone && (
          <Box component="span" sx={{ display: 'flex', mx: 0.75 }}>
            {p.icon}
          </Box>
        )}
        <MenuBar menus={p.menus} />
        <Box sx={{ flexGrow: 1 }} />
        {p.actions?.(false)}
      </Toolbar>
    </AppBar>
  )
}
