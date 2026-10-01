import { useEffect, useRef } from 'react'

/** ドラッグしているものがファイルか（トラックの並び替えなど、画面の中のドラッグは扱わない） */
const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')

/**
 * ページ上のどこにファイルをドロップしても `onFiles` に全部を渡す。
 * 受け付けることは画面の案内ではなく、マウスカーソル（コピーの形）で示す
 */
export function useFilesDrop(onFiles: (files: File[]) => void) {
  const onFilesRef = useRef(onFiles)
  onFilesRef.current = onFiles

  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) onFilesRef.current(files)
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])
}

/** ページ上のどこにファイルをドロップしても、最初の1つを `onFile` に渡す */
export function useFileDrop(onFile: (file: File) => void) {
  useFilesDrop((files) => onFile(files[0]))
}
