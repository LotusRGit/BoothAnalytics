import { useState, useEffect } from 'react'
import { GITHUB_RELEASES_API } from '../utils/constants'
import './UpdateBanner.css'

// semver 比較。プレリリース識別子（-beta.1 など）は数値部のみ比較し、
// プレリリースは正式版より小さいとみなす
function parseVersion(v) {
  const clean = v.replace(/^v/, '')
  const [core, pre] = clean.split('-')
  const nums = core.split('.').map(n => (Number.isFinite(+n) ? +n : 0))
  return { nums, pre: pre ?? null }
}

function compareVersions(a, b) {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if ((va.nums[i] ?? 0) > (vb.nums[i] ?? 0)) return 1
    if ((va.nums[i] ?? 0) < (vb.nums[i] ?? 0)) return -1
  }
  // 同じコアバージョン: プレリリースなしの方が大きい
  if (va.pre === null && vb.pre !== null) return 1
  if (va.pre !== null && vb.pre === null) return -1
  return 0
}

export default function UpdateBanner() {
  const [update, setUpdate]       = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const currentRaw = window.boothApp
          ? await window.boothApp.getVersion()
          : null
        if (!currentRaw) return

        const res = await fetch(GITHUB_RELEASES_API)
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
