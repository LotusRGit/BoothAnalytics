import { useState, useEffect } from 'react'
import './UpdateBanner.css'

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
  }
  return 0
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        // Electron 環境でのみバージョン取得
        const currentRaw = window.boothApp
          ? await window.boothApp.getVersion()
          : null
        if (!currentRaw) return

        const res = await fetch(
          'https://api.github.com/repos/LotusRGit/BoothAnalytics/releases/latest'
        )
        if (!res.ok) return
        const { tag_name, html_url } = await res.json()
        if (compareVersions(tag_name, currentRaw) > 0) {
          setUpdate({ latest: tag_name, url: html_url })
        }
      } catch {
        // ネットワーク不可などは無視
      }
    }
    check()
  }, [])

  if (!update || dismissed) return null

  return (
    <div className="update-banner">
      <span>🎉 新しいバージョン <strong>{update.latest}</strong> が利用可能です。</span>
      <a href={update.url} target="_blank" rel="noreferrer" className="update-link">
        ダウンロード
      </a>
      <button className="update-dismiss" onClick={() => setDismissed(true)}>✕</button>
    </div>
  )
}
