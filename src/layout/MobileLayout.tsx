import { useState, type ReactNode } from 'react'
import { Box, IconButton, Stack, Tab, Tabs, Tooltip, useMediaQuery } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesLeft, faAnglesRight, faThumbtack } from '@fortawesome/free-solid-svg-icons'
import { LANDSCAPE_PHONE } from '../theme'
import { useLabels } from '../labels'

/** 下（横向きでは右）のタブ。`content` はタブの中に表示するもの */
export interface MobileTab {
  key: string
  label: string
  content: ReactNode
}

interface Props {
  /** 編集領域（ファイルを開く前は案内） */
  editor: ReactNode
  /** 編集領域のすぐ下の1行（選択範囲など） */
  editorFooter: ReactNode
  /** 表示ツール。編集領域のすぐ下に常に表示する */
  view: ReactNode
  tabs: MobileTab[]
  playBar: ReactNode
  /** 横向きで、右の欄をたためるようにする */
  collapsible?: boolean
  /** 横向きで右の欄を固定するか（たたむか）を覚える localStorage のキー */
  storageKey: string
  /** たたんだ右の欄を開く帯の説明（省略すると「欄を開く」） */
  openLabel?: string
}

/** 右の欄の幅（px） */
const SIDE_WIDTH = 320

/**
 * スマホの配置。編集領域 / 表示ツール / タブとパネル / 再生バー。
 * 表示ツールは編集領域を見ながら使うため、タブに入れず常に出しておく。
 * ページ全体はスクロールさせず、パネルの中だけをスクロールする
 */
export function MobileLayout(p: Props) {
  const l = useLabels()
  const [tab, setTab] = useState(p.tabs[0]?.key ?? '')
  const landscape = useMediaQuery(LANDSCAPE_PHONE)
  const readPinned = () => {
    try {
      return localStorage.getItem(p.storageKey) !== '0'
    } catch {
      return true
    }
  }
  // 横向きの右の欄: 固定（いつも出す）か、たたむか。たたんだときは、右端の帯で上に重ねて開く（peek）
  const [pinnedState, setPinnedState] = useState(readPinned)
  const pinned = !p.collapsible || pinnedState
  const [peek, setPeek] = useState(false)
  const setPinned = (v: boolean) => {
    setPinnedState(v)
    setPeek(false)
    try {
      localStorage.setItem(p.storageKey, v ? '1' : '0')
    } catch {
      // 覚えられなくても動く
    }
  }

  const viewBar = (
    <Stack
      direction="row"
      useFlexGap
      // ボタンが増えても1段に収め、はみ出した分は横にスクロールする（折り返すと編集領域の高さが削られる）
      sx={{ flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 0, alignItems: 'center', gap: 0.5, px: 0.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', scrollbarWidth: 'none', '& > *': { flexShrink: 0 } }}
    >
      {p.view}
    </Stack>
  )
  const footer = <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>{p.editorFooter}</Box>
  const tabs = (
    <Tabs
      value={tab}
      onChange={(_, v: string) => setTab(v)}
      variant="fullWidth"
      sx={{ minHeight: 40, borderTop: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', '& .MuiTab-root': { minHeight: 40 } }}
    >
      {p.tabs.map((x) => <Tab key={x.key} value={x.key} label={x.label} />)}
    </Tabs>
  )
  const panel = <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1 }}>{p.tabs.find((x) => x.key === tab)?.content}</Box>

  // 横向き: 高さが足りないので、左に編集領域と表示ツール、右にタブとパネルを並べる。右の欄はたためる
  if (landscape) {
    const side = (
      <Box sx={{ width: SIDE_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          {p.collapsible && (
            <Tooltip title={pinned ? l.panelCollapse : l.panelPin}>
              <IconButton size="small" onClick={() => setPinned(!pinned)} sx={{ mx: 0.25 }}>
                <FontAwesomeIcon icon={pinned ? faAnglesRight : faThumbtack} fontSize={13} />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>{tabs}</Box>
        </Stack>
        {panel}
      </Box>
    )
    return (
      <>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, minHeight: 0, p: 0.5, bgcolor: 'background.paper' }}>{p.editor}</Box>
            {viewBar}
            {footer}
          </Box>
          {pinned ? (
            side
          ) : (
            <>
              {/* たたんだとき: 右端の細い帯。押すと右の欄を上に重ねて開き、編集領域を触ると閉じる */}
              <Tooltip title={p.openLabel ?? l.panelOpen}>
                <Box
                  role="button"
                  onClick={() => setPeek(true)}
                  sx={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }}
                >
                  <FontAwesomeIcon icon={faAnglesLeft} fontSize={12} />
                </Box>
              </Tooltip>
              {peek && (
                <>
                  <Box onPointerDown={() => setPeek(false)} sx={{ position: 'absolute', inset: 0, right: SIDE_WIDTH, zIndex: 2 }} />
                  <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 3, display: 'flex', boxShadow: 6 }}>{side}</Box>
                </>
              )}
            </>
          )}
        </Box>
        {p.playBar}
      </>
    )
  }

  return (
    <>
      <Box sx={{ flex: '0 0 42%', minHeight: 180, p: 0.5, bgcolor: 'background.paper' }}>{p.editor}</Box>
      {viewBar}
      {footer}
      {tabs}
      {panel}
      {p.playBar}
    </>
  )
}
