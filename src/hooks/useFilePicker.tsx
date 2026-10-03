import { useRef } from 'react'
import { pickOpenFiles } from '../web/fileAccess'

/**
 * ファイル選択ダイアログ（複数選べる）。`input` を画面のどこかに置き、`open()` で開く。
 * 使えるブラウザでは、フォルダを覚える選択画面（File System Access API）を使い、選んだ最初のファイルを最近使用したファイルに記録する
 */
export function useFilesPicker(accept: string, onFiles: (files: File[]) => void, description = '', multiple = true) {
  const ref = useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={multiple}
      hidden
      onChange={(e) => {
        const files = Array.from(e.target.files ?? [])
        if (files.length) onFiles(files)
        // 同じファイルを続けて選んでも change が起きるように空にする
        e.target.value = ''
      }}
    />
  )
  const open = async () => {
    const exts = accept.split(',').map((s) => s.trim()).filter((s) => s.startsWith('.'))
    const files = await pickOpenFiles(exts, description, multiple)
    if (files?.length) onFiles(files)
    // 使えない環境では input で選ぶ（null はやめたとき）
    else if (files === undefined) ref.current?.click()
  }
  return { input, open: () => void open() }
}

/** ファイル選択ダイアログ（1つだけ選ぶ） */
export const useFilePicker = (accept: string, onFile: (file: File) => void, description = '') => useFilesPicker(accept, (files) => onFile(files[0]), description, false)
