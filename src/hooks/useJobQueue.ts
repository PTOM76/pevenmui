import { useEffect, useRef, useState } from 'react'

/** `cancelled` はその曲だけ中止したもの（保存するときは待機中として残す） */
export type JobStatus = 'waiting' | 'running' | 'done' | 'error' | 'cancelled'

/** 一覧の 1 件。アプリは結果などの項目を足して使う */
export interface JobItem {
  id: number
  file: File
  status: JobStatus
  /** 処理中の進み具合（0〜1） */
  progress: number
  error?: string
  /** 書き出した形式の拡張子（.wav など） */
  ext?: string
  /** 結果をダウンロードしたか（形はアプリが決める。処理し直すと消す） */
  saved?: unknown
}

/** 一覧を IndexedDB などに残す方法。`S` は残す形（アプリが決める） */
export interface JobPersist<T extends JobItem, S> {
  /** 残すか（偽なら前回の一覧を戻さず、残したものも消す。起動時に 1 回だけ見る） */
  enabled: boolean
  /** 残し方の設定。変わったら一覧を書き直す（toStored の結果が変わるため） */
  mode?: string
  load(): Promise<T[]>
  clear(): Promise<void>
  /** 残すもの（残す必要がなければ null） */
  toStored(item: T): S | null
  /** 残したものが変わったかを見分ける文字列（変わったときだけ書き込む） */
  signature(stored: S | null): string
  /** 1 件を書き込む（null なら消す） */
  put(id: number, stored: S | null): Promise<void>
}

export interface JobQueueOptions<T extends JobItem, S, R> {
  /** 1 件を処理し、結果として item に足す項目を返す。`signal` が止まったら中断する */
  process(item: T, ctx: { signal: AbortSignal; onProgress: (p: number) => void; resource: R }): Promise<Partial<T>>
  /** 一覧の処理を始めるときに 1 回用意するもの（モデルなど）。1 件だけ中止したあとは用意し直す */
  open?(signal: AbortSignal): Promise<R>
  /** 用意したものを片付ける（一覧が終わったとき、中止したとき。1 件だけ中止したときは、それで処理を止める） */
  close?(resource: R): void
  persist?: JobPersist<T, S>
}

let nextId = 1

/**
 * ファイルの一覧を 1 件ずつ順に処理する（WeVocalExtractor の抽出、WeVocalConverter の変換）。
 * 一覧の復元と保存、一覧ごとの中止、1 件だけの中止、やり直しを受け持つ
 */
export function useJobQueue<T extends JobItem, S = unknown, R = undefined>(opts: JobQueueOptions<T, S, R>) {
  const [items, setItems] = useState<T[]>([])
  const [running, setRunning] = useState(false)
  /** 用意（open）で失敗したときの理由 */
  const [error, setError] = useState<string | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const optsRef = useRef(opts)
  optsRef.current = opts
  const abortRef = useRef<AbortController | null>(null)
  /** 処理中の 1 件と、それだけを止めるもの（`cancelItem`） */
  const currentRef = useRef<{ id: number; ac: AbortController } | null>(null)

  // 画面を離れるときは処理を止める
  useEffect(() => () => abortRef.current?.abort(), [])

  // 1 件ごとに、最後に書き込んだ内容（`signature`）
  const written = useRef(new Map<number, string>())
  // 前回の一覧を戻す（読み終わる前に足された件は後ろに並べる）。読み終わるまでは書き込まない
  const [restored, setRestored] = useState(!opts.persist)
  // 戻すのは 1 回だけ（開発中の StrictMode は 2 回呼ぶ。2 回足すと同じ件が 2 つ並んだ）
  const restoringRef = useRef(false)
  useEffect(() => {
    const persist = optsRef.current.persist
    if (!persist || restoringRef.current) return
    restoringRef.current = true
    if (!persist.enabled) {
      void persist.clear().then(() => setRestored(true))
      return
    }
    void persist.load().then((saved) => {
      nextId = Math.max(nextId, ...saved.map((it) => it.id + 1))
      saved.forEach((it) => written.current.set(it.id, persist.signature(persist.toStored(it))))
      setItems((list) => [...saved.filter((s) => !list.some((it) => it.id === s.id)), ...list])
      setRestored(true)
    })
  }, [])

  // 一覧が変わったら、変わった件だけ書き込む（進み具合だけの変化では書かない）。一覧から消えた件は消す
  useEffect(() => {
    const persist = optsRef.current.persist
    if (!persist || !restored) return
    const ids = new Set(items.map((it) => it.id))
    for (const it of items) {
      const s = persist.toStored(it)
      const sig = persist.signature(s)
      if (written.current.get(it.id) === sig) continue
      written.current.set(it.id, sig)
      void persist.put(it.id, s)
    }
    for (const id of written.current.keys()) {
      if (ids.has(id)) continue
      written.current.delete(id)
      void persist.put(id, null)
    }
  }, [items, restored, opts.persist?.mode])

  /** `id` の件を書き換える。`p` が関数なら、その時点の件から書き換える内容を作る */
  const patch = (id: number, p: Partial<T> | ((item: T) => Partial<T>)) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...(typeof p === 'function' ? p(it) : p) } : it)))

  const add = (files: File[]) => setItems((list) => [...list, ...files.map((file) => ({ id: nextId++, file, status: 'waiting', progress: 0 }) as T)])
  const remove = (id: number) => setItems((list) => list.filter((it) => it.id !== id))
  /** 処理中の件だけを残して消す */
  const clear = () => setItems((list) => list.filter((it) => it.status === 'running'))

  /** 待機中の件を上から順に処理する。`only` を渡すとその件だけ（状態によらず 1 回。失敗した件や、設定を変えてのやり直しにも使う） */
  const run = async (only?: number) => {
    if (abortRef.current) return
    if (only === undefined && !itemsRef.current.some((it) => it.status === 'waiting')) return
    const { open, close } = optsRef.current
    let onlyLeft = only !== undefined
    const ac = new AbortController()
    abortRef.current = ac
    setRunning(true)
    setError(null)
    // 用意したもの。1 件だけ中止して片付けたら null にし、次の件の前に用意し直す
    let resource: { value: R } | null = null
    const closeResource = () => {
      if (resource) close?.(resource.value)
      resource = null
    }
    const prepare = async () => {
      if (!resource) resource = { value: open ? await open(ac.signal) : (undefined as R) }
      return resource.value
    }
    ac.signal.addEventListener('abort', closeResource)
    try {
      await prepare()
      for (;;) {
        // 途中で足された件も拾うため、毎回一覧から次を探す
        const item = only === undefined ? itemsRef.current.find((it) => it.status === 'waiting') : onlyLeft ? itemsRef.current.find((it) => it.id === only) : undefined
        onlyLeft = false
        if (!item || ac.signal.aborted) break
        const value = await prepare()
        const one = new AbortController()
        const stop = () => one.abort()
        ac.signal.addEventListener('abort', stop)
        // その件だけ中止したら、用意したものを片付けて処理を止める（WebGPU の推論などは signal では止まらない）
        one.signal.addEventListener('abort', () => !ac.signal.aborted && closeResource())
        currentRef.current = { id: item.id, ac: one }
        // やり直すときは、前の結果のダウンロード済みの印も消す
        patch(item.id, { status: 'running', progress: 0, error: undefined, saved: undefined } as Partial<T>)
        try {
          const r = await optsRef.current.process(item, { signal: one.signal, onProgress: (p) => patch(item.id, { progress: p } as Partial<T>), resource: value })
          if (one.signal.aborted) throw new DOMException('cancelled', 'AbortError')
          patch(item.id, { status: 'done', progress: 1, ...r })
        } catch (e) {
          // 一覧ごと中止したときは待機中に戻す（もう一度「すべて…」で続きから）。その件だけ中止したら中止にして次へ
          if (ac.signal.aborted) patch(item.id, { status: 'waiting', progress: 0 } as Partial<T>)
          else if (one.signal.aborted) patch(item.id, { status: 'cancelled', progress: 0 } as Partial<T>)
          else patch(item.id, { status: 'error', error: e instanceof Error ? e.message : String(e) } as Partial<T>)
        } finally {
          ac.signal.removeEventListener('abort', stop)
          currentRef.current = null
        }
      }
    } catch (e) {
      // 用意で失敗した（中止したときは何も出さない）
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : String(e))
    } finally {
      ac.signal.removeEventListener('abort', closeResource)
      closeResource()
      abortRef.current = null
      setRunning(false)
    }
  }

  /** 一覧ごと中止する */
  const cancel = () => abortRef.current?.abort()
  /** `id` だけを中止する。処理中なら止めて次の件へ、待機中なら飛ばす */
  const cancelItem = (id: number) => {
    if (currentRef.current?.id === id) currentRef.current.ac.abort()
    else patch(id, { status: 'cancelled', progress: 0 } as Partial<T>)
  }

  return { items, running, error, add, remove, clear, run, cancel, cancelItem, patch }
}
