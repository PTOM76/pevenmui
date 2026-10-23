// 名前を付けた配置（スクリーンセット）の一覧を覚え、保存と呼び出しと削除をする。取り出しと戻しはドック（useDock の snapshot、applyScreenset）
import { useCallback, useState } from 'react'
import { useDock } from './dock'
import type { Screenset } from './dockLayout'

export interface NamedScreenset {
  name: string
  set: Screenset
}

const load = (key: string): NamedScreenset[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is NamedScreenset => !!x && typeof x.name === 'string' && !!x.set?.places) : []
  } catch {
    return []
  }
}

/** 配置の一覧。apply は、配置で開いていたパネルの名前を返す（開くのはアプリ） */
export function useScreensets(storageKey = 'peven.screensets') {
  const dock = useDock()
  const [list, setList] = useState(() => load(storageKey))
  const write = useCallback(
    (next: NamedScreenset[]) => {
      setList(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // 保存できなくても、このセッション中は使う
      }
    },
    [storageKey],
  )
  /** 今の配置を、名前を付けて保存する（同じ名前は上書き） */
  const save = (name: string) => {
    if (!dock) return
    const set = dock.snapshot()
    write(list.some((x) => x.name === name) ? list.map((x) => (x.name === name ? { name, set } : x)) : [...list, { name, set }])
  }
  const apply = (name: string): string[] => {
    const s = list.find((x) => x.name === name)
    return s && dock ? dock.applyScreenset(s.set) : []
  }
  const remove = (name: string) => write(list.filter((x) => x.name !== name))
  return { names: list.map((x) => x.name), save, apply, remove }
}
