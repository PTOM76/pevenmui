// 時間の表記の変換（「分:秒.ミリ秒」）。アプリで共通

/** 「分:秒」「時:分:秒」「秒」の文字を秒にする（小数可）。読めなければ null */
export function parseTime(text: string): number | null {
  const parts = text.trim().replace(/：/g, ':').split(':')
  if (parts.length > 3 || parts.some((x) => !/^\d*\.?\d+$|^\d+\.?$/.test(x))) return null
  return parts.reduce((s, x) => s * 60 + Number(x), 0)
}

/** 秒を「分:秒.ミリ秒」で表す */
export function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}
