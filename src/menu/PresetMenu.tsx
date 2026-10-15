// プリセットのメニュー（呼び出し、今の値の保存、削除。アプリで共通。保存する値の型と文字はアプリが決める）
import { useState } from 'react'
import { Button } from '@mui/material'
import { ContextMenu, type MenuEntry } from './MenuList'
import { RenameDialog } from '../dialog/RenameDialog'
import { pevenFont } from '../tokens'

/** プリセット（名前と、保存した値） */
export interface Preset<P> {
  name: string
  params: P
}

/** 表示する文字。defaultName は保存するときの名前の初期値（n は何番目か） */
export interface PresetLabels {
  button: string
  empty: string
  save: string
  remove: string
  defaultName: (n: number) => string
}

/** 「プリセット」のボタン。押すと、呼び出し、今の値の保存、削除のメニュー。同じ名前で保存したら置き換える */
export function PresetMenu<P>(p: { params: P; presets: Preset<P>[]; onApply: (params: P) => void; onChange: (presets: Preset<P>[]) => void; labels: PresetLabels; disabled?: boolean }) {
  const l = p.labels
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)
  // 保存するときの名前の入力（null なら閉じている）
  const [naming, setNaming] = useState<string | null>(null)
  const entries: MenuEntry[] = [
    ...(p.presets.length ? p.presets.map((pr): MenuEntry => ({ label: pr.name, onClick: () => p.onApply(pr.params) })) : [{ label: l.empty, disabled: true, onClick: () => {} }]),
    { divider: true },
    { label: l.save, onClick: () => setNaming(l.defaultName(p.presets.length + 1)) },
    {
      label: l.remove,
      disabled: !p.presets.length,
      submenu: p.presets.map((pr, i): MenuEntry => ({ label: pr.name, onClick: () => p.onChange(p.presets.filter((_, j) => j !== i)) })),
    },
  ]
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        disabled={p.disabled}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setMenuAt({ x: r.left, y: r.bottom })
        }}
        sx={{ minWidth: 0, height: 24, px: 1, fontSize: pevenFont('md') }}
      >
        {l.button}
      </Button>
      <ContextMenu position={menuAt} entries={entries} onClose={() => setMenuAt(null)} />
      <RenameDialog
        name={naming}
        title={l.save}
        onClose={() => setNaming(null)}
        onRename={(name) => p.onChange([...p.presets.filter((pr) => pr.name !== name.trim()), { name: name.trim(), params: p.params }])}
      />
    </>
  )
}
