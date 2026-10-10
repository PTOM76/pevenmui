// 文字の表示を押すと、その場で入力欄になる部品（再生位置の時間、拍子など。ふだんは周りの文字と同じ見た目）
import { useEffect, useState } from 'react'
import { ButtonBase, InputBase } from '@mui/material'

/**
 * ふだんは `text` を周りの文字と同じ見た目で出し、押すと下線付きの入力欄になる（Enter で決める、Esc と欄を離れるとやめる）。
 * `onCommit` が false を返したら、読めない値として赤くして入力を続ける。`editRequest` が変わったら入力を始める
 */
export function InlineEdit(p: { text: string; draftOf?: () => string; onCommit?: (text: string) => boolean; label: string; width?: string; editRequest?: number }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const start = () => {
    setDraft(p.draftOf?.() ?? p.text)
    setError(false)
  }
  useEffect(() => {
    if (p.editRequest) start()
    // 頼まれたときだけ始める
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.editRequest])
  const commit = () => {
    if (draft !== null && p.onCommit?.(draft) === false) return setError(true)
    setDraft(null)
  }
  if (draft !== null)
    return (
      <InputBase
        autoFocus
        value={draft}
        error={error}
        onChange={(e) => {
          setDraft(e.target.value)
          setError(false)
        }}
        onFocus={(e) => e.target.select()}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') setDraft(null)
        }}
        inputProps={{ 'aria-label': p.label, style: { padding: 0, width: p.width ?? '9ch', fontFamily: 'monospace', fontSize: 'inherit' } }}
        sx={{ fontSize: 'inherit', lineHeight: 'inherit', verticalAlign: 'baseline', borderBottom: 1, borderColor: error ? 'error.main' : 'primary.main' }}
      />
    )
  if (!p.onCommit) return <>{p.text}</>
  // ボタンの箱で文字の高さがずれないよう、ふつうの文字と同じ並びにする
  return (
    <ButtonBase
      component="span"
      title={p.label}
      onClick={start}
      sx={{ display: 'inline', verticalAlign: 'baseline', font: 'inherit', lineHeight: 'inherit', p: 0, borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
    >
      {p.text}
    </ButtonBase>
  )
}
