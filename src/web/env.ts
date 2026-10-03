/** スマホやタブレットか（iPadOS はパソコンの Safari と同じ名乗りをするので、タッチの点数でも見分ける） */
export const isMobile = () => {
  const data = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (data?.mobile) return true
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

/** インストールした PWA として開いているか（ブラウザのタブではない） */
export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
