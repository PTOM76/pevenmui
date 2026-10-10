// 再生中の時間の表示（部品の中だけで更新する）。アプリで共通
import { formatTime, parseTime } from './time'
import { useLivePosition } from './useLivePosition'
import { InlineEdit } from './InlineEdit'

/** 表示を更新する間隔（ミリ秒）。時間の数字が読める速さで十分 */
const UPDATE_MS = 100

/**
 * 「再生位置 / 長さ」の表示。再生中はこの部品だけが自分で更新する。
 * `onSeek` を渡すと、再生位置を押して数字を直接入れられる（Enter で移動、Esc でやめる）。
 * `editRequest` が変わったら入力を始める（目盛りの右クリックメニューから）。`inputLabel` は入力欄の名前（ツールチップ）
 */
export default function LiveTime(p: { position: number; playing: boolean; livePosition: () => number; duration: number; onSeek?: (t: number) => void; editRequest?: number; inputLabel: string }) {
  const now = useLivePosition(p.position, p.playing, p.livePosition, UPDATE_MS)
  const commit = (text: string) => {
    const v = parseTime(text)
    if (v === null) return false
    p.onSeek?.(Math.max(0, Math.min(p.duration, v)))
    return true
  }
  return (
    <>
      <InlineEdit text={formatTime(now)} draftOf={() => formatTime(p.livePosition())} onCommit={p.onSeek && commit} label={p.inputLabel} editRequest={p.editRequest} /> / {formatTime(p.duration)}
    </>
  )
}
