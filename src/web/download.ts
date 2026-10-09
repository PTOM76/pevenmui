/** Blob をファイルとしてダウンロードさせる */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // すぐ消すと、大きなファイルの保存が途中で失敗するブラウザがある
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
