// 設定を localStorage に保存し、Context で部品とフックに渡す（アプリごとに createSettingsStore を 1 回呼ぶ）
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** `key` に保存する設定のストアを作る。古い保存にない項目は既定値で埋める */
export function createSettingsStore<S extends object>(key: string, defaults: S) {
  /** localStorage から読む。使えない環境（プライベートモードなど）や壊れた値では既定値を使う */
  const load = (): S => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<S>) } : defaults
    } catch {
      return defaults
    }
  }
  function useSettings() {
    const [settings, setState] = useState<S>(load)
    const update = useCallback((patch: Partial<S>) => {
      setState((s) => {
        const next = { ...s, ...patch }
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // 保存できなくても、このセッション中は設定を使う
        }
        return next
      })
    }, [])
    // ほかのウィンドウで変えた設定を読み直す（storage イベントは、書いたウィンドウ以外にだけ届く）
    useEffect(() => {
      const f = (e: StorageEvent) => e.key === key && setState(load())
      window.addEventListener('storage', f)
      return () => window.removeEventListener('storage', f)
    }, [])
    return { settings, update }
  }
  type Store = ReturnType<typeof useSettings>
  const SettingsContext = createContext<Store | null>(null)
  /** 設定を持ち、内側の部品とフックに渡す（main.tsx で App を包む） */
  function SettingsProvider({ children }: { children: ReactNode }) {
    const { settings, update } = useSettings()
    const store = useMemo(() => ({ settings, update }), [settings, update])
    return createElement(SettingsContext.Provider, { value: store }, children)
  }
  /** 設定を読む（SettingsProvider の中だけで使える） */
  function useAppSettings(): Store {
    const store = useContext(SettingsContext)
    if (!store) throw new Error('useAppSettings は SettingsProvider の中で使う')
    return store
  }
  return { load, useSettings, SettingsProvider, useAppSettings, SettingsContext }
}
