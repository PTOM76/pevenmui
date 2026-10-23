// dockLayout.ts のテスト
import { describe, expect, it } from 'vitest'
import { layoutPanels, pruneLayout, type LayoutNode, type SavedLayout } from './dockLayout'

const leaf = (id: string, views: string[], size = 100): LayoutNode => ({ type: 'leaf', data: { id, views, activeView: views[0] }, size })
const layout = (root: LayoutNode, panels: string[], activeGroup?: string): SavedLayout => ({
  grid: { root, width: 400, height: 600, orientation: 'HORIZONTAL' },
  panels: Object.fromEntries(panels.map((p) => [p, { id: p, contentComponent: 'host', title: p }])),
  activeGroup,
})

describe('pruneLayout', () => {
  const two = layout({ type: 'branch', size: 600, data: [leaf('g1', ['a', 'b'], 300), leaf('g2', ['c'], 300)] }, ['a', 'b', 'c'], 'g2')

  it('全部残るなら、そのまま', () => {
    const out = pruneLayout(two, new Set(['a', 'b', 'c']))!
    expect(layoutPanels(out).sort()).toEqual(['a', 'b', 'c'])
    expect(out.grid.root).toEqual(two.grid.root)
    expect(out.activeGroup).toBe('g2')
  })

  it('組の中の閉じたパネルを外し、残る見出しを選ぶ', () => {
    const out = pruneLayout(two, new Set(['b', 'c']))!
    const data = (out.grid.root.data as LayoutNode[])[0].data as { views: string[]; activeView: string }
    expect(data.views).toEqual(['b'])
    expect(data.activeView).toBe('b')
    expect(layoutPanels(out).sort()).toEqual(['b', 'c'])
  })

  it('組が空になれば外す。1 つだけ残っても枝のまま（根は枝）', () => {
    const out = pruneLayout(two, new Set(['c']))!
    expect(out.grid.root.type).toBe('branch')
    const only = (out.grid.root.data as LayoutNode[])[0]
    expect(only.type).toBe('leaf')
    expect((only.data as { id: string }).id).toBe('g2')
    expect(out.activeGroup).toBe('g2')
  })

  it('消えた組が選ばれていたときは、残る最初の組を選ぶ', () => {
    const out = pruneLayout(two, new Set(['a']))!
    expect(out.activeGroup).toBe('g1')
  })

  it('何も残らなければ null', () => {
    expect(pruneLayout(two, new Set(['x']))).toBeNull()
  })

  it('入れ子の分割も整理する。浮かせた窓は持ち越さない', () => {
    const nested = layout(
      { type: 'branch', size: 600, data: [leaf('g1', ['a']), { type: 'branch', size: 300, data: [leaf('g2', ['b']), leaf('g3', ['c'])] }] },
      ['a', 'b', 'c'],
      'g3',
    )
    nested.floatingGroups = [{ data: {} }]
    const out = pruneLayout(nested, new Set(['a', 'c']))!
    const children = out.grid.root.data as LayoutNode[]
    expect(children).toHaveLength(2)
    // 分割の向きは枝の深さで決まるので、子が 1 つになった枝も残す
    expect(children[1].type).toBe('branch')
    expect(children[1].size).toBe(300)
    expect((children[1].data as LayoutNode[]).map((c) => (c.data as { id: string }).id)).toEqual(['g3'])
    expect(out.floatingGroups).toBeUndefined()
  })
})
