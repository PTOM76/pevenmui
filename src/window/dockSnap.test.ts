// dockSnap.ts のテスト
import { afterEach, describe, expect, it, vi } from 'vitest'
import { snapEdge, watchWindowSnap, type Rect } from './dockSnap'

const main: Rect = { x: 0, y: 0, w: 1000, h: 800 }
const win = (cx: number, cy: number): Rect => ({ x: cx - 200, y: cy - 150, w: 400, h: 300 })

describe('snapEdge', () => {
  it('真ん中が端に寄っていれば、その端', () => {
    expect(snapEdge(win(100, 400), main)).toBe('left')
    expect(snapEdge(win(900, 400), main)).toBe('right')
    expect(snapEdge(win(500, 60), main)).toBe('top')
    expect(snapEdge(win(500, 740), main)).toBe('bottom')
  })

  it('真ん中あたりや、端から離れていれば置かない', () => {
    expect(snapEdge(win(500, 400), main)).toBeNull()
    expect(snapEdge(win(300, 400), main)).toBeNull()
  })

  it('本体の窓の外（別の画面など）は置かない', () => {
    expect(snapEdge(win(-50, 400), main)).toBeNull()
    expect(snapEdge(win(1200, 400), main)).toBeNull()
    expect(snapEdge(win(500, 900), main)).toBeNull()
  })

  it('角では、いちばん近い端', () => {
    expect(snapEdge(win(40, 100), main)).toBe('left')
    expect(snapEdge(win(200, 20), main)).toBe('top')
  })

  it('本体の窓の大きさがなければ置かない', () => {
    expect(snapEdge(win(0, 0), { x: 0, y: 0, w: 0, h: 0 })).toBeNull()
  })
})

describe('watchWindowSnap', () => {
  afterEach(() => vi.useRealTimers())

  /** 窓の位置を差し替えられる見せかけの窓 */
  const fake = (r: Rect) => ({ screenX: r.x, screenY: r.y, outerWidth: r.w, outerHeight: r.h, closed: false }) as unknown as Window
  const move = (w: Window, r: Rect) => Object.assign(w, { screenX: r.x, screenY: r.y, outerWidth: r.w, outerHeight: r.h })

  const setup = (initial: Rect = win(500, 400)) => {
    vi.useFakeTimers()
    vi.stubGlobal('window', { screenX: 0, screenY: 0, outerWidth: 1000, outerHeight: 800 })
    let t = 0
    vi.spyOn(performance, 'now').mockImplementation(() => t)
    const w = fake(initial)
    const guides: (string | null)[] = []
    const drops: string[] = []
    const stop = watchWindowSnap(w, { onGuide: (e) => guides.push(e), onDrop: (e) => drops.push(e), intervalMs: 100, settleMs: 300 })
    const tick = (ms: number) => {
      t += ms
      vi.advanceTimersByTime(ms)
    }
    return { w, guides, drops, stop, tick }
  }

  it('端に寄せて止めると、その端に置く（動かしているあいだは印を出す）', () => {
    const { w, guides, drops, tick } = setup()
    move(w, win(300, 400))
    tick(100)
    move(w, win(100, 400))
    tick(100)
    expect(guides.at(-1)).toBe('left')
    tick(100)
    expect(drops).toEqual([])
    tick(400)
    expect(drops).toEqual(['left'])
    expect(guides.at(-1)).toBeNull()
  })

  it('動かしていなければ置かない（開いた位置が端に近くても）', () => {
    const { drops, tick } = setup(win(100, 400))
    tick(1000)
    expect(drops).toEqual([])
  })

  it('1 回で飛んだだけ（OS が窓を寄せたなど）は置かない', () => {
    const { w, drops, tick } = setup()
    move(w, win(100, 400))
    tick(100)
    tick(1000)
    expect(drops).toEqual([])
  })

  it('真ん中で止めたら置かない。大きさを変えただけでも置かない', () => {
    const { w, drops, tick } = setup()
    move(w, win(520, 410))
    tick(100)
    tick(600)
    expect(drops).toEqual([])
    move(w, { x: 0, y: 100, w: 300, h: 300 })
    tick(100)
    tick(600)
    expect(drops).toEqual([])
  })

  it('見張りをやめると、印も消える', () => {
    const { w, guides, stop, tick } = setup()
    move(w, win(100, 400))
    tick(100)
    stop()
    expect(guides.at(-1)).toBeNull()
  })
})
