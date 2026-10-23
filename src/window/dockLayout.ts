// ドックの配置（分割の並び、タブの組、大きさ）を覚える。名前を付けた配置（スクリーンセット）の取り出しと書き込みもここ。dockview の保存形式（toJSON）をそのまま持ち、戻すときは、今開いているパネルだけを残して使う
import type { DockEdge } from './dock'

/** dockview の保存形式のうち、ここで触る部分（残りはそのまま持ち回る） */
export interface LayoutNode {
  type: 'leaf' | 'branch'
  data: unknown
  size?: number
  visible?: boolean
}
interface LeafData {
  views: string[]
  activeView?: string
  id: string
  [key: string]: unknown
}
export interface SavedLayout {
  grid: { root: LayoutNode; height: number; width: number; orientation: unknown }
  panels: Record<string, unknown>
  activeGroup?: string
  floatingGroups?: unknown[]
  popoutGroups?: unknown[]
  [key: string]: unknown
}

const key = (edge: DockEdge) => `peven.dockLayout.${edge}`

export function loadLayout(edge: DockEdge): SavedLayout | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key(edge)) ?? 'null')
    return v && typeof v === 'object' && 'grid' in v && 'panels' in v ? (v as SavedLayout) : null
  } catch {
    return null
  }
}

export function saveLayout(edge: DockEdge, layout: SavedLayout) {
  try {
    localStorage.setItem(key(edge), JSON.stringify(layout))
  } catch {
    // 保存できなくても、このセッション中は使う
  }
}

/** 枝（分割）から、残るものだけを残す。空になれば null。子が 1 つになった枝も、枝のまま残す（分割の向きは枝の深さで決まるので、置き換えると向きがずれる） */
function prune(node: LayoutNode, keep: ReadonlySet<string>): LayoutNode | null {
  if (node.type === 'leaf') {
    const d = node.data as LeafData
    const views = d.views.filter((v) => keep.has(v))
    if (!views.length) return null
    return { ...node, data: { ...d, views, activeView: d.activeView && views.includes(d.activeView) ? d.activeView : views[0] } }
  }
  const children = (node.data as LayoutNode[]).map((c) => prune(c, keep)).filter((c): c is LayoutNode => c !== null)
  if (!children.length) return null
  return { ...node, data: children }
}

/** 最初に見つかる組（leaf）の id */
function firstGroup(node: LayoutNode): string | undefined {
  if (node.type === 'leaf') return (node.data as LeafData).id
  for (const c of node.data as LayoutNode[]) {
    const id = firstGroup(c)
    if (id) return id
  }
  return undefined
}

/** 組（leaf）に残っている id の一覧 */
function groups(node: LayoutNode): string[] {
  return node.type === 'leaf' ? [(node.data as LeafData).id] : (node.data as LayoutNode[]).flatMap(groups)
}

/**
 * 保存した配置から、今開いているパネル（keep の名前）だけを残した配置。残るものがなければ null。
 * 浮かせた窓、別の窓に出したものは持ち越さない（置き場所は端の欄だけ）
 */
export function pruneLayout(layout: SavedLayout, keep: ReadonlySet<string>): SavedLayout | null {
  const root = prune(layout.grid.root, keep)
  if (!root) return null
  // dockview の根は、いつも枝にする（組 1 つだけでも、枝の中に入れて持つ）
  const wrapped: LayoutNode = root.type === 'branch' ? root : { type: 'branch', data: [root], size: root.size }
  const panels = Object.fromEntries(Object.entries(layout.panels).filter(([id]) => keep.has(id)))
  const alive = groups(wrapped)
  const activeGroup = layout.activeGroup && alive.includes(layout.activeGroup) ? layout.activeGroup : firstGroup(wrapped)
  const { floatingGroups: _f, popoutGroups: _p, edgeGroups: _e, ...rest } = layout
  return { ...rest, grid: { ...layout.grid, root: wrapped }, panels, ...(activeGroup ? { activeGroup } : {}) }
}

const EDGES: DockEdge[] = ['bottom', 'left', 'right', 'top']

/** 欄の大きさを覚えるキー（DockArea の sizeKey。省いたときの名前） */
export const defaultSizeKey = (edge: DockEdge) => (edge === 'bottom' ? 'peven.dockHeight' : `peven.dock.${edge}`)
/** 端ごとに、今の DockArea が使っている大きさのキー */
const sizeKeys = new Map<DockEdge, string>()
export const setSizeKey = (edge: DockEdge, k: string) => void sizeKeys.set(edge, k)
const sizeKey = (edge: DockEdge) => sizeKeys.get(edge) ?? defaultSizeKey(edge)

/** 名前を付けて覚える配置（スクリーンセット）。置き場所、端ごとの分割とタブの組、欄の大きさ、開いていたパネル */
export interface Screenset {
  places: Record<string, DockEdge | 'dialog'>
  layouts: Partial<Record<DockEdge, SavedLayout>>
  sizes: Partial<Record<DockEdge, number>>
  open: string[]
}

/** 今の配置を取り出す（端ごとの配置と大きさは、覚えている値から） */
export function captureScreenset(places: Record<string, DockEdge | 'dialog'>, open: string[]): Screenset {
  const layouts: Screenset['layouts'] = {}
  const sizes: Screenset['sizes'] = {}
  for (const edge of EDGES) {
    const l = loadLayout(edge)
    if (l) layouts[edge] = l
    try {
      const v = Number(localStorage.getItem(sizeKey(edge)))
      if (Number.isFinite(v) && v > 0) sizes[edge] = v
    } catch {
      // 読めなければ標準の大きさ
    }
  }
  return { places, layouts, sizes, open }
}

/** 配置の、端ごとの分割と大きさを書く（欄を作り直すと、これを読む） */
export function writeScreenset(s: Screenset) {
  for (const edge of EDGES) {
    const l = s.layouts[edge]
    try {
      if (l) localStorage.setItem(key(edge), JSON.stringify(l))
      else localStorage.removeItem(key(edge))
      const v = s.sizes[edge]
      if (v) localStorage.setItem(sizeKey(edge), String(v))
      else localStorage.removeItem(sizeKey(edge))
    } catch {
      // 書けなくても、置き場所は戻る
    }
  }
}

/** 配置に入っているパネルの名前 */
export function layoutPanels(layout: SavedLayout): string[] {
  return Object.keys(layout.panels)
}
