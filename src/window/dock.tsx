// ドックの状態。WindowDialog の dockable なダイアログを、ダイアログの代わりに画面の端の欄（DockArea）に置ける。
// どの端（下、左、右、上）に置くかは、ダイアログの名前（name）ごとに覚える。同じ端に複数置けば、欄の中で並べたり、タブで切り替えたりできる（DockArea）。
// アプリは DockProvider で包み、画面の端に DockArea を置く
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box } from '@mui/material'
import { watchWindowSnap } from './dockSnap'

/** 欄を置ける端 */
export type DockEdge = 'bottom' | 'left' | 'right' | 'top'
export const DOCK_EDGES: DockEdge[] = ['bottom', 'left', 'right', 'top']

/** 画面に出す文字（アプリが訳す） */
export interface DockLabels {
  /** ダイアログの題名の横のボタン（欄に置く） */
  dock: string
  /** 欄の中のボタン（ダイアログにする） */
  undock: string
  close: string
  /** 欄の中のタブの右クリックのメニュー（置く端を変える）。省くとメニューを出さない */
  edges?: Record<DockEdge, string>
}

export interface DockTab {
  name: string
  title: string
  /** 置いている端 */
  edge: DockEdge
  /** 欄の標準の大きさ（欄が下か上なら高さ、左か右なら幅。px。利用者が変えていなければ使う） */
  size?: number
  onClose: () => void
}

export interface DockApi {
  labels: DockLabels
  /** 名前のダイアログを欄に置くと選んでいるか（覚えた設定。標準の置き場所は含めない） */
  isDocked: (name: string) => boolean
  /** 覚えた置き場所。端か、ダイアログにすると選んだ（'dialog'）か、まだ選んでいない（null。標準の置き場所に従う） */
  edgeOf: (name: string) => DockEdge | 'dialog' | null
  /** 置く、外す（ダイアログにする）。edge を省くと、置いていた端（なければ下） */
  setDocked: (name: string, docked: boolean, edge?: DockEdge) => void
  /** 欄の中の、そのダイアログの中身を入れる要素（欄にまだなければ null） */
  hostOf: (name: string) => HTMLElement | null
  /** 欄の側が、中身を入れる要素を知らせる */
  setHost: (name: string, el: HTMLElement | null) => void
  /** 欄の中で今見えているか（タブで隠れているものは false。見えているものだけ中身を出す） */
  isVisible: (name: string) => boolean
  setVisible: (name: string, visible: boolean) => void
  /** アプリのツールバーの中の、欄に置いた中身が自分のメニューやボタンを出す場所（DockToolHost が出していなければ null） */
  toolHost: HTMLElement | null
  /** 欄に置いて開いているダイアログ（タブ）。登録の順 */
  tabs: DockTab[]
  /** 欄に置いて開いているダイアログを、タブとして登録する。戻り値で外す */
  register: (tab: DockTab) => () => void
  /**
   * 別の窓（ポップアップ）に出しているダイアログの窓を見張る。本体の窓の端に寄せて離したら、その端の欄に置く
   * （寄せている間は、置ける端に印を出す）。windowSnap が false なら何もしない。戻り値で見張りをやめる
   */
  trackWindow: (name: string, win: Window) => () => void
}

export const DockContext = createContext<DockApi | null>(null)
export const useDock = () => useContext(DockContext)

/** 覚えている置き場所（名前 → 端、またはダイアログにすると選んだ 'dialog'）。古い形（置いたダイアログの名前の配列）は、すべて下として読む */
const loadDocked = (key: string): Record<string, DockEdge | 'dialog'> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (Array.isArray(v)) return Object.fromEntries(v.filter((x): x is string => typeof x === 'string').map((n) => [n, 'bottom' as const]))
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter((e): e is [string, DockEdge | 'dialog'] => e[1] === 'dialog' || DOCK_EDGES.includes(e[1] as DockEdge)))
  } catch {
    // 読めなければ、何も置いていないことにする
  }
  return {}
}

/** ドックの状態を持つ。storageKey に、欄に置くダイアログの名前と端を覚える */
export function DockProvider({ labels, storageKey = 'peven.docked', windowSnap = true, children }: { labels: DockLabels; storageKey?: string; /** 別の窓を端に寄せて離したら置くか */ windowSnap?: boolean; children: ReactNode }) {
  const [docked, setDockedMap] = useState(() => loadDocked(storageKey))
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({})
  const [visible, setVisibleMap] = useState<Record<string, boolean>>({})
  const [toolHost, setToolHost] = useState<HTMLElement | null>(null)
  const [tabs, setTabs] = useState<DockTab[]>([])
  const setDocked = useCallback(
    (name: string, on: boolean, edge?: DockEdge) =>
      setDockedMap((map) => {
        const { [name]: old, ...rest } = map
        const next: Record<string, DockEdge | 'dialog'> = { ...rest, [name]: on ? (edge ?? (old && old !== 'dialog' ? old : 'bottom')) : 'dialog' }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // 保存できなくても、このセッション中は使う
        }
        return next
      }),
    [storageKey],
  )
  const setHost = useCallback(
    (name: string, el: HTMLElement | null) =>
      setHosts((map) => {
        if (el ? map[name] === el : !(name in map)) return map
        const { [name]: _, ...rest } = map
        return el ? { ...rest, [name]: el } : rest
      }),
    [],
  )
  const setVisible = useCallback((name: string, on: boolean) => setVisibleMap((map) => (map[name] === on ? map : { ...map, [name]: on })), [])
  const [guide, setGuide] = useState<DockEdge | null>(null)
  const trackWindow = useCallback(
    (name: string, win: Window) => (windowSnap ? watchWindowSnap(win, { onGuide: setGuide, onDrop: (edge) => setDocked(name, true, edge) }) : () => {}),
    [windowSnap, setDocked],
  )
  const register = useCallback((tab: DockTab) => {
    setTabs((list) => [...list.filter((t) => t.name !== tab.name), tab])
    return () => setTabs((list) => list.filter((t) => t.name !== tab.name))
  }, [])
  const api = useMemo<DockApi>(
    () => ({ labels, isDocked: (n) => !!docked[n] && docked[n] !== 'dialog', edgeOf: (n) => docked[n] ?? null, setDocked, hostOf: (n) => hosts[n] ?? null, setHost, isVisible: (n) => visible[n] ?? false, setVisible, toolHost, tabs, register, trackWindow }),
    [labels, docked, setDocked, hosts, setHost, visible, setVisible, toolHost, tabs, register, trackWindow],
  )
  return (
    <DockContext.Provider value={api}>
      <ToolHostSetter.Provider value={setToolHost}>{children}</ToolHostSetter.Provider>
      <SnapGuide edge={guide} />
      <EdgeDropZones edgeLabels={labels.edges} onDrop={(name, edge) => setDocked(name, true, edge)} />
    </DockContext.Provider>
  )
}

/** DockToolHost だけが読む（ツールバーの場所の要素の受け取り） */
const ToolHostSetter = createContext<(el: HTMLElement | null) => void>(() => {})

/**
 * アプリのツールバーに置く、欄の中身のための場所。欄に置いたダイアログは、ここへ portal で自分のメニューバーやボタンを出す
 * （ダイアログや別の窓のときは、自分の中に出す）。欄に何もなければ空
 */
export function DockToolHost() {
  const setToolHost = useContext(ToolHostSetter)
  return <Box ref={setToolHost} sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflowX: 'auto' }} />
}

/** 別の窓を端に寄せているあいだ、置ける端に出す印（本体の窓の端の帯。操作は受けない） */
function SnapGuide({ edge }: { edge: DockEdge | null }) {
  if (!edge) return null
  const vertical = edge === 'left' || edge === 'right'
  return (
    <Box
      aria-hidden
      sx={{ position: 'fixed', zIndex: 1600, pointerEvents: 'none', bgcolor: 'primary.main', opacity: 0.25, border: 2, borderColor: 'primary.main', [edge]: 0, [vertical ? 'top' : 'left']: 0, [vertical ? 'bottom' : 'right']: 0, [vertical ? 'width' : 'height']: vertical ? '30%' : '35%' }}
    />
  )
}

/** 画面の端の帯の幅（px） */
const ZONE = 56

/**
 * 欄のタブをドラッグしているあいだ、画面の 4 つの端に出す落とす先。落とすと、その端の欄に置く。
 * タブは dockview の中でも分割して並べられる（欄の中は dockview が受ける）が、欄をまたいだ移動は、ここで受ける
 */
function EdgeDropZones({ edgeLabels, onDrop }: { edgeLabels?: Record<DockEdge, string>; onDrop: (name: string, edge: DockEdge) => void }) {
  const [name, setName] = useState<string | null>(null)
  const [over, setOver] = useState<DockEdge | null>(null)
  useEffect(() => {
    const start = (e: DragEvent) => {
      const tab = (e.target as Element | null)?.closest?.('.dv-tab')
      const n = tab?.querySelector('[data-dock-name]')?.getAttribute('data-dock-name')
      if (n) setName(n)
    }
    const end = () => {
      setName(null)
      setOver(null)
    }
    document.addEventListener('dragstart', start, true)
    document.addEventListener('dragend', end, true)
    document.addEventListener('drop', end, true)
    return () => {
      document.removeEventListener('dragstart', start, true)
      document.removeEventListener('dragend', end, true)
      document.removeEventListener('drop', end, true)
    }
  }, [])
  if (!name) return null
  const place: Record<DockEdge, object> = {
    left: { left: 0, top: 0, bottom: 0, width: ZONE },
    right: { right: 0, top: 0, bottom: 0, width: ZONE },
    top: { top: 0, left: ZONE, right: ZONE, height: ZONE },
    bottom: { bottom: 0, left: ZONE, right: ZONE, height: ZONE },
  }
  return (
    <>
      {DOCK_EDGES.map((edge) => (
        <Box
          key={edge}
          data-dock-zone={edge}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(edge)
          }}
          onDragLeave={() => setOver((o) => (o === edge ? null : o))}
          onDrop={(e) => {
            e.preventDefault()
            onDrop(name, edge)
            setName(null)
            setOver(null)
          }}
          sx={{ position: 'fixed', zIndex: 1700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'primary.contrastText', border: 2, borderColor: 'primary.main', bgcolor: over === edge ? 'primary.main' : 'transparent', backgroundImage: over === edge ? 'none' : 'linear-gradient(rgba(127,127,127,.18), rgba(127,127,127,.18))', opacity: over === edge ? 0.7 : 0.9, ...place[edge] }}
        >
          {over === edge ? edgeLabels?.[edge] : null}
        </Box>
      ))}
    </>
  )
}
