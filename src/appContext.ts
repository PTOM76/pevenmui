import { createContext, useContext } from 'react'
import type { App } from './app'

/** PevenProvider に渡したアプリの定義（渡していなければ null） */
export const AppContext = createContext<App | null>(null)

export const useApp = () => useContext(AppContext)
