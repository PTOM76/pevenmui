import type { ReactNode } from 'react'
import { Box, Stack } from '@mui/material'
import { usePanelWidth } from './Splitter'

interface Props {
  toolbar: ReactNode
  /** 編集領域（ファイルを開く前は案内）。画面の残りの高さをすべて使う */
  editor: ReactNode
  /** 右側のインスペクタに縦に並べるパネル */
  inspector: ReactNode
  statusBar: ReactNode
  /** インスペクタの幅を覚える localStorage のキー */
  storageKey: string
  /** インスペクタの幅の既定値と、分割バーで変えられる範囲（px） */
  width?: number
  minWidth?: number
  maxWidth?: number
}

/**
 * PC の配置。ツールバー / 編集領域＋右のインスペクタ / ステータスバー。
 * ページ全体はスクロールさせず、編集領域は画面の残りをすべて使う。インスペクタだけは中でスクロールする
 */
export function DesktopLayout({ width = 320, minWidth = 240, maxWidth = 560, ...p }: Props) {
  const inspector = usePanelWidth(p.storageKey, width, minWidth, maxWidth)
  return (
    <>
      {p.toolbar}
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        {/* 編集領域は端まで使う（上に余白を作らない） */}
        <Box sx={{ flex: 1, minWidth: 0, bgcolor: 'background.paper' }}>{p.editor}</Box>
        {inspector.bar}
        {/* 左の編集領域と同じ背景にし、カードで囲まずに分割バーだけで分ける */}
        <Box sx={{ width: inspector.width, flexShrink: 0, overflowY: 'auto', bgcolor: 'background.paper' }}>
          {p.inspector}
        </Box>
      </Stack>
      {p.statusBar}
    </>
  )
}
