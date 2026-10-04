import { useSyncExternalStore } from 'react'

/**
 * 進んでいる処理の一覧。
 * 画面にはまとめて 1 本のゲージ（JobGauge）を出し、押すとそれぞれの進み具合を見られる
 */

export interface Job<K extends string = string> {
  id: number
  /** 大まかな種類（ゲージに出す名前は JobGauge の `kindLabel` で決める） */
  kind: K
  /** 詳しい名前（「ボーカルを抽出中…」など） */
  label: string
  /** 0〜1。負なら割合が分からない */
  progress: number
  /** 中止（できないものは無し） */
  cancel?: () => void
}

let jobs: Job[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** 進んでいる処理（始めた順） */
export const useJobs = <K extends string = string>() => useSyncExternalStore(subscribe, () => jobs) as Job<K>[]

/** 処理を一覧に足す。返す `update` で進み具合を、`end` で終わりを知らせる */
export function startJob(kind: string, label: string, cancel?: () => void) {
  const id = nextId++
  jobs = [...jobs, { id, kind, label, progress: 0, cancel }]
  emit()
  return {
    update(progress: number) {
      const i = jobs.findIndex((j) => j.id === id)
      // 同じ値なら知らせない（細かく呼ばれても描き直さない）
      if (i < 0 || Math.abs(jobs[i].progress - progress) < 0.001) return
      jobs = jobs.map((j) => (j.id === id ? { ...j, progress } : j))
      emit()
    },
    end() {
      if (!jobs.some((j) => j.id === id)) return
      jobs = jobs.filter((j) => j.id !== id)
      emit()
    },
  }
}
