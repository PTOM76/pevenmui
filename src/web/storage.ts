// ブラウザ内に保存しているデータの使用量と削除（設定の「データ」。アプリで共通）

/** 使用量と上限（バイト）。`details` は種類ごとの内訳（Chrome などだけ）。ブラウザが対応していなければ null */
export async function storageUsage(): Promise<{ usage: number; quota: number; details?: Record<string, number> } | null> {
  if (!navigator.storage?.estimate) return null
  const e = (await navigator.storage.estimate()) as StorageEstimate & { usageDetails?: Record<string, number> }
  return { usage: e.usage ?? 0, quota: e.quota ?? 0, details: e.usageDetails }
}

/**
 * オフライン用キャッシュを消し、Service Worker の登録を外す。次にページを開いたときに、アプリ本体をサーバーから取り直して登録し直す。
 * このアプリの範囲（BASE_URL）のものだけ消す。`extra` の名前のキャッシュ（追加機能など）も消す
 */
export async function clearOfflineCache(extra: string[] = []) {
  // workbox のキャッシュ名は scope で終わる
  const scope = new URL(import.meta.env.BASE_URL, location.href).href
  if ('caches' in window) {
    for (const key of await caches.keys()) if (key.endsWith(scope) || extra.includes(key)) await caches.delete(key)
  }
  if (navigator.serviceWorker) {
    for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === scope) await r.unregister()
  }
}

/** localStorage のうち、`prefix` で始まる項目（設定と画面の状態）を消す */
export function clearLocalItems(prefix: string) {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key)
  } catch {
    // localStorage が使えない環境では、もともと何も保存されていない
  }
}

/** ブラウザが容量不足のときに自動で消さないようにする申請が通っているか（対応していなければ null） */
export async function isPersisted(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null
  return navigator.storage.persisted()
}

/** 自動で消さないよう申請する。通ったかを返す（ブラウザが断ることもある） */
export async function requestPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

/** バイトを「12.3 MB」にする */
export const formatMb = (bytes: number) => `${(bytes / 2 ** 20).toFixed(1)} MB`
