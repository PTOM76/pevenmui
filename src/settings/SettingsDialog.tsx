import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faChevronRight, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { enterToSubmit } from '../dialog/enterToSubmit'
import { useLabels } from '../labels'
import { NarrowContext } from './controls'
import { matches, SearchContext } from './search'
import { WindowPortal, type WindowMode } from '../window/WindowPortal'
import { WindowModeContext } from '../window/WindowDialog'

/** 設定の分類 */
export interface SettingsCategory<C extends string> {
  id: C
  label: string
  /** 検索の対象（その分類のグループ名・項目名・説明文）。項目を足したらここにも足す */
  texts: string[]
}

interface Props<S, C extends string> {
  open: boolean
  onClose: () => void
  title: string
  settings: S
  defaults: S
  onChange: (patch: Partial<S>) => void
  categories: SettingsCategory<C>[]
  /** 最初に開く分類（既定は先頭） */
  initial?: C
  /** 分類ごとの中身。`set` で変えた値は `draft` に入る（PC は OK・適用で反映、スマホはすぐ反映） */
  pages: (draft: S, set: (patch: Partial<S>) => void) => Record<C, ReactNode>
  /** PC での出し方（既定は WindowModeContext）。スマホは常に全画面のダイアログ */
  windowMode?: WindowMode
}

/** 検索語に一致する項目がある分類（分類名そのものの一致も含む）。検索語が空ならすべて */
export function matchCategories<C extends string>(categories: SettingsCategory<C>[], query: string) {
  if (!query.trim()) return categories
  return categories.filter((c) => matches(c.label, query) || c.texts.some((s) => matches(s, query)))
}

/**
 * 設定画面。PC は Windows の設定画面風に、左の分類から選んで右で変え、「OK」「適用」で反映・保存、「キャンセル」なら捨てる。
 * スマホは Android の設定風に、分類の一覧から各画面へ進み、変更はその場で反映する
 */
export function SettingsDialog<S extends object, C extends string>(p: Props<S, C>) {
  const l = useLabels()
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('sm'))
  const ctxMode = useContext(WindowModeContext)
  const windowMode = p.windowMode ?? ctxMode
  const [category, setCategory] = useState<C>(p.initial ?? p.categories[0].id)
  // 設定の検索。一致する項目がある分類だけを一覧に出す
  const [query, setQuery] = useState('')
  // 開いたときだけ、選ばれている分類にフォーカスを置く（autoFocus だと、検索で選ばれる分類が変わるたびに検索欄からフォーカスを奪う）
  const tabListRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!p.open) return
    const id = requestAnimationFrame(() => tabListRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
    return () => cancelAnimationFrame(id)
  }, [p.open])
  const shown = matchCategories(p.categories, query)
  const shownIds = shown.map((c) => c.id)
  // 選んでいた分類が絞り込みで消えたら、残った最初の分類を出す
  const current = shownIds.includes(category) ? category : (shownIds[0] ?? category)
  const [draft, setDraft] = useState(p.settings)
  // スマホで開いている分類の画面（null なら一覧）
  const [page, setPage] = useState<C | null>(null)
  // 開くたびに今の設定から始める
  useEffect(() => {
    if (p.open) {
      setDraft(p.settings)
      setPage(null)
      setQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open])
  const set = (patch: Partial<S>) => {
    setDraft((d) => ({ ...d, ...patch }))
    if (narrow) p.onChange(patch)
  }
  const dirty = (Object.keys(draft) as (keyof S)[]).some((k) => draft[k] !== p.settings[k])
  const pages = p.pages(draft, set)
  const label = (id: C) => p.categories.find((c) => c.id === id)?.label ?? id
  const ok = () => {
    p.onChange(draft)
    p.onClose()
  }

  const searchField = (
    <TextField
      size="small"
      fullWidth
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      // Esc: 入力があればまず検索語を消す（空なら今までどおり設定画面を閉じる）
      onKeyDown={(e) => {
        if (e.key === 'Escape' && query) {
          e.stopPropagation()
          setQuery('')
        }
      }}
      placeholder={l.search}
      slotProps={{
        // 検索欄の Enter で設定画面を閉じない
        htmlInput: { 'aria-label': l.search, 'data-no-submit': true },
        input: {
          // PC は右側の選択欄と同じくらいの高さに詰める（スマホは押しやすい既定の高さ）
          sx: { fontSize: narrow ? 15 : 13, '& .MuiInputBase-input': { py: narrow ? undefined : 0.5 } },
          startAdornment: (
            <InputAdornment position="start">
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 12, opacity: 0.6 }} />
            </InputAdornment>
          ),
        },
      }}
    />
  )
  const noResults = !shown.length && <Typography sx={{ fontSize: 13, color: 'text.secondary', p: 2 }}>{l.noResults}</Typography>

  /** 分類の一覧での ↑↓ / Home / End。分類を切り替えて、その項目にフォーカスを移す */
  const moveCategory = (e: React.KeyboardEvent<HTMLElement>) => {
    const i = shownIds.indexOf(current)
    const next = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: shownIds.length - 1 }[e.key]
    if (next === undefined || !shownIds.length) return
    e.preventDefault()
    const j = Math.max(0, Math.min(shownIds.length - 1, next))
    setCategory(shownIds[j])
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[j]?.focus()
  }

  // スマホ: Android の設定と同じく、分類の一覧 → 各画面へ進む形。変更はその場で反映し、OK・キャンセルは置かない
  if (narrow)
    return (
      <NarrowContext.Provider value>
        <Dialog open={p.open} onClose={p.onClose} fullScreen>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 56, px: 0.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <IconButton aria-label={l.back} onClick={() => (page ? setPage(null) : p.onClose())}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </IconButton>
            <Typography sx={{ fontSize: 18, fontWeight: 500 }}>{page ? label(page) : p.title}</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {page ? (
              <Box sx={{ p: 2 }}>
                <SearchContext.Provider value={query}>{pages[page]}</SearchContext.Provider>
              </Box>
            ) : (
              <List>
                <Box sx={{ px: 2, pb: 1 }}>{searchField}</Box>
                {noResults}
                {shown.map((c) => (
                  <ListItemButton key={c.id} onClick={() => setPage(c.id)} sx={{ py: 1.5 }}>
                    <Typography sx={{ flex: 1, fontSize: 15 }}>{c.label}</Typography>
                    <FontAwesomeIcon icon={faChevronRight} style={{ opacity: 0.5 }} />
                  </ListItemButton>
                ))}
                <ListItemButton onClick={() => set(p.defaults)} sx={{ py: 1.5, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 15, color: 'error.main' }}>{l.resetAll}</Typography>
                </ListItemButton>
              </List>
            )}
          </Box>
        </Dialog>
      </NarrowContext.Provider>
    )

  const body = (
    <>
      <DialogContent dividers sx={{ display: 'flex', gap: 2, p: 0 }}>
        {/* ↑↓ で分類を切り替え、Home / End で最初・最後へ（右の項目へは Tab で移る） */}
        <Box sx={{ width: 180, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1, pb: 0 }}>{searchField}</Box>
          <List ref={tabListRef} dense role="tablist" aria-orientation="vertical" onKeyDown={moveCategory} sx={{ py: 0.5 }}>
            {shown.map((c) => (
              <ListItemButton
                key={c.id}
                role="tab"
                aria-selected={c.id === current}
                selected={c.id === current}
                // 選ばれている分類だけを Tab で止まる場所にする（ほかへは矢印キーで移る）
                tabIndex={c.id === current ? 0 : -1}
                onClick={() => setCategory(c.id)}
                sx={{ fontSize: 13 }}
              >
                {c.label}
              </ListItemButton>
            ))}
          </List>
          {noResults}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, overflowX: 'hidden', py: 2, pr: 2 }}>
          {shown.length > 0 && <SearchContext.Provider value={query}>{pages[current]}</SearchContext.Provider>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={() => setDraft(p.defaults)} sx={{ mr: 'auto' }}>
          {l.resetAll}
        </Button>
        <Button size="small" onClick={ok}>
          {l.ok}
        </Button>
        <Button size="small" onClick={p.onClose}>
          {l.cancel}
        </Button>
        <Button size="small" disabled={!dirty} onClick={() => p.onChange(draft)}>
          {l.apply}
        </Button>
      </DialogActions>
    </>
  )
  const dialog = (
    // PC ではカテゴリの一覧と項目を並べても窮屈にならない大きさにする
    <Dialog
      open={p.open}
      onClose={p.onClose}
      onKeyDown={enterToSubmit(ok)}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: { maxWidth: 720, height: 'min(600px, calc(100% - 64px))' } } }}
    >
      <DialogTitle sx={{ fontSize: 16, py: 1.5 }}>{p.title}</DialogTitle>
      {body}
    </Dialog>
  )
  if (windowMode === 'dialog') return dialog
  // 別の窓では題名は窓の枠に出るので、中身と下のボタンだけを並べる。開けなければダイアログで出す
  return (
    <WindowPortal open={p.open} mode={windowMode} name="settings" title={p.title} width={720} height={560} onClose={p.onClose} fallback={dialog}>
      <Box onKeyDown={enterToSubmit(ok)} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        {body}
      </Box>
    </WindowPortal>
  )
}
