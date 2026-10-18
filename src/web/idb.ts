// IndexedDB の最小限の読み書き（キーと値）。画面（メインスレッド）と Worker の両方から使える
const STORE = 'kv'

export interface Idb {
  get(key: string): Promise<unknown>
  getMany(keys: string[]): Promise<unknown[]>
  put(key: string, value: unknown): Promise<void>
  putMany(entries: [string, unknown][]): Promise<void>
  delete(key: string): Promise<void>
  /** `prefix` で始まるキーの一覧 */
  keys(prefix: string): Promise<string[]>
  /** `prefix` で始まるキーをすべて消す */
  deletePrefix(prefix: string): Promise<void>
  /** すべて消す。`keep` で始まるキーは残す */
  clear(keep?: string): Promise<void>
}

/** `dbName` のデータベースを読み書きする。開くのは操作のたびで、終わったら閉じる */
export function createIdb(dbName: string): Idb {
  const openDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

  /** ストアに対して1回の操作を行う */
  async function withStore<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb()
    try {
      return await new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }

  /** 書き込みのトランザクションで `op` を行い、終わるまで待つ */
  async function withTx(op: (s: IDBObjectStore) => void) {
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        op(tx.objectStore(STORE))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  async function getMany(keys: string[]): Promise<unknown[]> {
    const db = await openDb()
    try {
      return await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const store = tx.objectStore(STORE)
        const values = new Array<unknown>(keys.length)
        keys.forEach((key, i) => {
          const req = store.get(key)
          req.onsuccess = () => {
            values[i] = req.result
          }
          req.onerror = () => reject(req.error)
        })
        tx.oncomplete = () => resolve(values)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  const putMany = (entries: [string, unknown][]) => withTx((store) => {
    for (const [key, value] of entries) store.put(value, key)
  })

  return {
    get: (key) => withStore<unknown>('readonly', (s) => s.get(key)),
    getMany,
    put: (key, value) => withStore('readwrite', (s) => s.put(value, key)).then(() => {}),
    putMany,
    delete: (key) => withStore('readwrite', (s) => s.delete(key)).then(() => {}),
    keys: (prefix) => withStore('readonly', (s) => s.getAllKeys(IDBKeyRange.bound(prefix, `${prefix}￿`))).then((k) => k.map(String)),
    deletePrefix: (prefix) => withTx((s) => s.delete(IDBKeyRange.bound(prefix, `${prefix}￿`))),
    clear: (keep) =>
      keep
        ? withTx((s) => {
            s.delete(IDBKeyRange.upperBound(keep, true))
            s.delete(IDBKeyRange.lowerBound(`${keep}￿`, true))
          })
        : withStore('readwrite', (s) => s.clear()).then(() => {}),
  }
}
