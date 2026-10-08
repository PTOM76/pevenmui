import { createContext, useContext } from 'react'
import type { Addons } from './store'

export interface AddonsContextValue {
  addons: Addons
  /** 追加機能の名前（設定の一覧では `short` なら短い名前） */
  nameOf: (id: string, short?: boolean) => string
}

/** 部品とフックが使う追加機能。アプリの外側で `<AddonsContext.Provider>` に入れる */
export const AddonsContext = createContext<AddonsContextValue | null>(null)

export function useAddons(): AddonsContextValue {
  const v = useContext(AddonsContext)
  if (!v) throw new Error('AddonsContext がありません')
  return v
}
