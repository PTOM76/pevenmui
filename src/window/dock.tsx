// ドック（画面の下の欄）。WindowDialog の dockable なダイアログを、ダイアログの代わりにこの欄に置ける。
// 置くかどうかはダイアログの名前（name）ごとに覚える。複数置けばタブで切り替える。アプリは DockProvider で包み、画面の好きな所に DockArea を置く
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, ButtonBase, IconButton, Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClone, faXmark } from '@fortawesome/free-solid-svg-icons'
import { usePersistentNumber } from '../layout/Splitter'

/** 画面に出す文字（アプリが訳す） */
export interface DockLabels {
  /** ダイアログの題名の横のボタン（下の欄に置く） */
  dock: string
  /** 欄の中のボタン（ダイアログにする） */
  undock: string
  close: string
}

interface Tab {
  name: string
  title: string
  onClose: () => void
}

export interface DockApi {
  labels: DockLabels
  /** 名前のダイアログを欄に置く設定か */
  isDocked: (name: string) => boolean
  setDocked: (name: string, docked: boolean) => void
  /** 欄の中身を入れる要素（DockArea が出していなければ null） */
  host: HTMLElement | null
  /** アプリのツールバーの中の、欄に置いた中身が自分のメニューやボタンを出す場所（DockToolHost が出していなければ null） */
  toolHost: HTMLElement | null
  /** 今出ているタブの名前 */
  active: string | null
  /** 欄に置いて開いているダイアログを、タブとして登録する。戻り値で外す */
  register: (tab: Tab) => () => void
}

export const DockContext = createContext<DockApi | null>(null)
export const useDock = () => useContext(DockContext)

const loadDocked = (key: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** ドックの状態を持つ。storageKey に、欄に置くダイアログの名前を覚える */
export function DockProvider({ labels, storageKey = 'peven.docked', children }: { labels: DockLabels; storageKey?: string; children: ReactNode }) {
  const [docked, setDockedList] = useState(() => loadDocked(storageKey))
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [toolHost, setToolHost] = useState<HTMLElement | null>(null)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [active, setActive] = useState<string | null>(null)
  const setDocked = useCallback(
    (name: string, on: boolean) =>
      setDockedList((list) => {
        const next = on ? [...list.filter((n) => n !== name), name] : list.filter((n) => n !== name)
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // 保存できなくても、このセッション中は使う
        }
        return next
      }),
    [storageKey],
  )
  const register = useCallback((tab: Tab) => {
    setTabs((list) => [...list.filter((t) => t.name !== tab.name), tab])
    setActive(tab.name)
    return () => {
      setTabs((list) => list.filter((t) => t.name !== tab.name))
      setActive((a) => (a === tab.name ? null : a))
    }
  }, [])
  // 出ているタブがなくなったら、残りの最後を出す
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.name === active)) setActive(tabs[tabs.length - 1].name)
  }, [tabs, active])
  const api = useMemo<DockApi>(() => ({ labels, isDocked: (n) => docked.includes(n), setDocked, host, toolHost, active, register }), [labels, docked, setDocked, host, toolHost, active, register])
  return (
    <DockContext.Provider value={api}>
      <DockTabs.Provider value={{ tabs, setActive, setHost, setToolHost }}>{children}</DockTabs.Provider>
    </DockContext.Provider>
  )
}

/** DockArea だけが読む（タブの一覧と、欄の要素の受け取り） */
const DockTabs = createContext<{ tabs: Tab[]; setActive: (name: string) => void; setHost: (el: HTMLElement | null) => void; setToolHost: (el: HTMLElement | null) => void }>({ tabs: [], setActive: () => {}, setHost: () => {}, setToolHost: () => {} })

/**
 * アプリのツールバーに置く、欄の中身のための場所。欄に置いたダイアログは、ここへ portal で自分のメニューバーやボタンを出す
 * （ダイアログや別の窓のときは、自分の中に出す）。欄に何もなければ空
 */
export function DockToolHost() {
  const { setToolHost } = useContext(DockTabs)
  return <Box ref={setToolHost} sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflowX: 'auto' }} />
}

/**
 * ドックの欄。置いたダイアログがなければ何も出さない。上の端をドラッグして高さを変える（高さは覚える）。
 * 欄の中はタブで、タブの × でダイアログを閉じ、「ダイアログにする」で欄から外す
 */
export function DockArea({ heightKey = 'peven.dockHeight', initialHeight = 440 }: { heightKey?: string; initialHeight?: number }) {
  const dock = useDock()
  const { tabs, setActive, setHost } = useContext(DockTabs)
  const [height, setHeight] = usePersistentNumber(heightKey, initialHeight)
  const drag = useRef<{ y: number; h: number } | null>(null)
  if (!dock || !tabs.length) return null
  const clamp = (v: number) => Math.max(160, Math.min(window.innerHeight - 160, v))
  return (
    <Box sx={{ flexShrink: 0, height: clamp(height), display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'relative' }}>
      <Box
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { y: e.clientY, h: height }
        }}
        onPointerMove={(e) => drag.current && setHeight(clamp(drag.current.h - (e.clientY - drag.current.y)))}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => setHeight(initialHeight)}
        sx={{ position: 'absolute', top: -3, left: 0, right: 0, height: 5, cursor: 'row-resize', zIndex: 3, touchAction: 'none', '&:hover, &:active': { bgcolor: 'primary.main' } }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 0.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {tabs.map((tab) => (
          <Box key={tab.name} sx={{ display: 'flex', alignItems: 'center', borderBottom: 2, borderColor: dock.active === tab.name ? 'primary.main' : 'transparent' }}>
            <ButtonBase onClick={() => setActive(tab.name)} sx={{ px: 1.25, height: 30, fontSize: 13, opacity: dock.active === tab.name ? 1 : 0.7 }}>
              {tab.title}
            </ButtonBase>
            <Tooltip title={dock.labels.undock}>
              <IconButton size="small" aria-label={dock.labels.undock} onClick={() => dock.setDocked(tab.name, false)}>
                <FontAwesomeIcon icon={faClone} />
              </IconButton>
            </Tooltip>
            <Tooltip title={dock.labels.close}>
              <IconButton size="small" aria-label={dock.labels.close} onClick={tab.onClose}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Box>
      {/* ダイアログの中身がここに入る（WindowDialog が portal で入れる） */}
      <Box ref={setHost} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} />
    </Box>
  )
}
