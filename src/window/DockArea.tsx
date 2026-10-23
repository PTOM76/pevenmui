// ドックの欄（画面の端の 1 辺）。dockview で、置いたダイアログをタブで切り替え、ドラッグで分割して並べられる。
// 置いたダイアログがなければ何も出さない。内側の端をドラッグして大きさを変える（大きさは覚える）。
// 欄の中身は WindowDialog が portal で入れる。タブの右クリックのメニューで、置く端を変えられる
import { useCallback, useEffect, useRef, useState } from 'react'
import { DockviewReact, type DockviewApi, type IDockviewPanelHeaderProps, type IDockviewPanelProps } from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { Box, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClone, faXmark } from '@fortawesome/free-solid-svg-icons'
import { usePalette } from '../hooks/usePalette'
import { usePersistentNumber } from '../layout/Splitter'
import { DOCK_EDGES, useDock, type DockEdge } from './dock'
import { loadLayout, pruneLayout, saveLayout, type SavedLayout } from './dockLayout'

/** パネルの中身を入れる要素を、ドックの状態に知らせる（中身は WindowDialog が portal で入れる） */
function HostPanel(props: IDockviewPanelProps) {
  const dock = useDock()
  const name = props.api.id
  const setHost = dock?.setHost
  const setVisible = dock?.setVisible
  const ref = useCallback((el: HTMLDivElement | null) => setHost?.(name, el), [setHost, name])
  // タブで隠れている間は、中身を出さない（アプリのツールバーに出す中身も含む）
  useEffect(() => {
    setVisible?.(name, props.api.isVisible)
    const sub = props.api.onDidVisibilityChange((e) => setVisible?.(name, e.isVisible))
    return () => {
      sub.dispose()
      setVisible?.(name, false)
    }
  }, [props.api, setVisible, name])
  return <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }} />
}

/** タブ。題名、ダイアログにするボタン、閉じるボタン。右クリックで置く端を変えるメニュー */
function DockTab(props: IDockviewPanelHeaderProps) {
  const dock = useDock()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  if (!dock) return null
  const name = props.api.id
  const tab = dock.tabs.find((t) => t.name === name)
  const edge = tab?.edge
  return (
    <Box
      data-dock-name={name}
      data-dock-edge={edge}
      onContextMenu={(e) => {
        if (!dock.labels.edges) return
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY })
      }}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.25, pl: 1, pr: 0.25, height: '100%', fontSize: 13 }}
    >
      <span>{props.api.title}</span>
      <Tooltip title={dock.labels.undock}>
        <IconButton size="small" aria-label={dock.labels.undock} onClick={() => dock.setDocked(name, false)} sx={{ p: 0.5 }}>
          <FontAwesomeIcon icon={faClone} size="xs" />
        </IconButton>
      </Tooltip>
      <Tooltip title={dock.labels.close}>
        <IconButton size="small" aria-label={dock.labels.close} onClick={() => tab?.onClose()} sx={{ p: 0.5 }}>
          <FontAwesomeIcon icon={faXmark} size="xs" />
        </IconButton>
      </Tooltip>
      <Menu open={!!menu} onClose={() => setMenu(null)} anchorReference="anchorPosition" anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}>
        {DOCK_EDGES.filter((e) => e !== edge).map((e) => (
          <MenuItem
            key={e}
            dense
            onClick={() => {
              setMenu(null)
              dock.setDocked(name, true, e)
            }}
          >
            {dock.labels.edges?.[e]}
          </MenuItem>
        ))}
        <MenuItem
          dense
          onClick={() => {
            setMenu(null)
            dock.setDocked(name, false)
          }}
        >
          {dock.labels.undock}
        </MenuItem>
      </Menu>
    </Box>
  )
}

const COMPONENTS = { host: HostPanel }

/** 欄の大きさ（高さか幅）の範囲 */
const MIN = 160
const clamp = (v: number, max: number) => Math.max(MIN, Math.min(max - MIN, v))

export function DockArea({ edge = 'bottom', sizeKey, initialSize = 440 }: { edge?: DockEdge; sizeKey?: string; initialSize?: number }) {
  const dock = useDock()
  const { dark } = usePalette()
  const [api, setApi] = useState<DockviewApi | null>(null)
  // 利用者が大きさを変えていなければ（覚えた値が 0）、置いたダイアログの標準の大きさ、なければ initialSize
  const [stored, setSize] = usePersistentNumber(sizeKey ?? (edge === 'bottom' ? 'peven.dockHeight' : `peven.dock.${edge}`), 0)
  const drag = useRef<{ p: number; s: number } | null>(null)
  const restored = useRef<DockviewApi | null>(null)
  // 配置が変わったら（少し待って）覚える。パネルがすべてなくなったときは、前の配置を残す
  useEffect(() => {
    if (!api) return
    let timer = 0
    const sub = api.onDidLayoutChange(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        try {
          if (api.panels.length) saveLayout(edge, api.toJSON() as unknown as SavedLayout)
        } catch {
          // 捨てられた dockview には触れない
        }
      }, 300)
    })
    return () => {
      window.clearTimeout(timer)
      sub.dispose()
    }
  }, [api, edge])
  const mine = dock ? dock.tabs.filter((t) => t.edge === edge) : []
  const hint = Math.max(0, ...mine.map((t) => t.size ?? 0))
  const size = stored || hint || initialSize
  const key = mine.map((t) => `${t.name}\n${t.title}`).join('\n\n')
  // 欄に置いたダイアログと、dockview のパネルをそろえる
  useEffect(() => {
    // 置いたものがなくなると欄ごと外れて dockview も捨てられるので、その api には触らない（次に置いたときに作り直す）
    if (!mine.length) return setApi(null)
    if (!api) return
    // この dockview を作って最初のときは、覚えた配置（分割、タブの組、大きさ）を、今開いているパネルだけ残して戻す
    if (restored.current !== api) {
      restored.current = api
      const saved = loadLayout(edge)
      const pruned = saved && pruneLayout(saved, new Set(mine.map((t) => t.name)))
      if (pruned) {
        try {
          api.fromJSON(pruned as never)
        } catch {
          api.clear()
        }
      }
    }
    const want = new Map(mine.map((t) => [t.name, t]))
    for (const panel of [...api.panels]) if (!want.has(panel.id)) api.removePanel(panel)
    for (const [name, t] of want) {
      const panel = api.getPanel(name)
      // 左と右の欄では、あとから置いたものを下に積む（インスペクタのように縦に並べる）。上と下の欄では、同じ組のタブにする
      if (!panel) api.addPanel({ id: name, component: 'host', title: t.title, renderer: 'always', ...(vertical && api.panels.length ? { position: { referencePanel: api.panels[api.panels.length - 1].id, direction: 'below' as const }, ...(t.length ? { initialHeight: t.length } : {}) } : {}) })
      else if (panel.title !== t.title) panel.api.setTitle(t.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key])
  if (!dock || !mine.length) return null
  const vertical = edge === 'left' || edge === 'right'
  const max = vertical ? window.innerWidth : window.innerHeight
  const value = clamp(size, max)
  // 内側の端（欄が下なら上の端）をつかむ。動かす向きは、欄が大きくなる向き
  const sign = edge === 'bottom' || edge === 'right' ? -1 : 1
  const pos = (e: { clientX: number; clientY: number }) => (vertical ? e.clientX : e.clientY)
  const inner = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' }[edge]
  return (
    <Box
      sx={{
        flexShrink: 0,
        [vertical ? 'width' : 'height']: value,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        [`border${inner === 'top' ? 'Top' : inner === 'bottom' ? 'Bottom' : inner === 'left' ? 'Left' : 'Right'}`]: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
      }}
    >
      <Box
        role="separator"
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { p: pos(e), s: value }
        }}
        onPointerMove={(e) => drag.current && setSize(clamp(drag.current.s + sign * (pos(e) - drag.current.p), max))}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => setSize(0)}
        sx={{ position: 'absolute', [inner]: -3, [vertical ? 'top' : 'left']: 0, [vertical ? 'bottom' : 'right']: 0, [vertical ? 'width' : 'height']: 5, cursor: vertical ? 'col-resize' : 'row-resize', zIndex: 3, touchAction: 'none', '&:hover, &:active': { bgcolor: 'primary.main' } }}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          // dockview の色を、アプリの配色にそろえる
          '--dv-group-view-background-color': 'transparent',
          '--dv-tabs-and-actions-container-background-color': 'transparent',
          '--dv-tabs-and-actions-container-height': '30px',
          '--dv-separator-border': 'transparent',
        }}
      >
        <DockviewReact className={dark ? 'dockview-theme-dark' : 'dockview-theme-light'} components={COMPONENTS} defaultTabComponent={DockTab} disableFloatingGroups onReady={(e) => setApi(e.api)} />
      </Box>
    </Box>
  )
}
