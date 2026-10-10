// 項目の定義（settingItems）から設定画面の 1 行を作る
import { Check, Choice, Row } from './controls'
import { NumberInput } from './NumberInput'
import type { AnyItem } from './items'

/** 項目の定義から設定画面の 1 行を作る（kind が value の項目は作らない） */
export function SettingRow<K extends string>({ item, value, onChange, t }: { item: AnyItem<K>; value: unknown; onChange: (v: unknown) => void; t: (key: K) => string }) {
  const v = value as never
  const help = item.help && t(item.help)
  switch (item.kind) {
    case 'check':
      return <Check checked={v} onChange={onChange} label={t(item.label)} help={help} />
    case 'choice': {
      // 数値の選択肢も Choice には文字列で渡し、戻すときに数値にする
      const options: [string, string][] = 'options' in item ? item.options.map(([o, k]) => [String(o), t(k)]) : item.values.map((o) => [String(o), item.format(o)])
      const back = typeof item.default === 'number' ? Number : String
      return (
        <Row label={t(item.label)} help={help}>
          <Choice<string> value={String(v)} onChange={(c) => onChange(back(c))} options={options} />
        </Row>
      )
    }
    case 'number':
      return (
        <Row label={t(item.label)} help={help}>
          <NumberInput value={v} onChange={(n) => onChange((item.round ?? Math.round)(n))} min={item.min} max={item.max} step={item.step} unit={item.unit} width={110} />
        </Row>
      )
    default:
      return null
  }
}
