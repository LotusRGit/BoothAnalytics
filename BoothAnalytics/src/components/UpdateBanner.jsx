import { useState, useEffect } from 'react'
import { GITHUB_RELEASES_API } from '../utils/constants'
import './UpdateBanner.css'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 1日
const LS_CHECKED_AT    = 'updateCheckedAt'
const LS_LATEST_TAG    = 'updateLatestTag'
const LS_LATEST_URL    = 'updateLatestUrl'
const LS_DISMISSED     = 'updateDismissed'

function parseVersion(v) {
  const clean = v.replace(/^v/, '')
  const [core, pre] = clean.split('-')
  const nums = core.split('.').map(n => (Number.isFinite(+n) ? +n : 0))
  return { nums, pre: pre ?? null }
}

// semver 比較。プレリリース同士の順序は文字列比較（beta.10 > beta.2 には未対応）
function compareVersions(a, b) {
  const va = parseVersion(a)
  const vb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if ((va.nums[i] ?? 0) > (vb.nums[i] ?? 0)) return 1
    if ((va.nums[i] ?? 0) < (vb.nums[i] ?? 0)) return -1
  }
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

        // dismiss 済みのバージョンと一致する場合はスキップ
        // ※ 両方 null の初回起動では dismiss !== null が false になるためスキップしない
        const dismissedTag = localStorage.getItem(LS_DISMISSED)
        const cachedTag    = localStorage.getItem(LS_LATEST_TAG)
        if (dismissedTag !== null && dismissedTag === cachedTag) return

        // 最後のチェックから1日以内ならキャッシュを使う
        const lastChecked = Number(localStorage.getItem(LS_CHECKED_AT) ?? 0)
        const now = Date.now()

        let tag, url
        if (cachedTag && now - lastChecked < CHECK_INTERVAL_MS) {
          tag = cachedTag
          url = localStorage.getItem(LS_LATEST_URL)
        } else {
          const res = await fetch(GITHUB_RELEASES_API)
          if (!res.ok) return
          const json = await res.json()
          tag = json.tag_name
          url = json.html_url
          localStorage.setItem(LS_CHECKED_AT, String(now))
          localStorage.setItem(LS_LATEST_TAG, tag)
          localStorage.setItem(LS_LATEST_URL, url)
        }

        if (tag && compareVersions(tag, currentRaw) > 0) {
          if (localStorage.getItem(LS_DISMISSED) !== tag) {
            setUpdate({ latest: tag, url })
          }
        }
      } catch {
        // ネットワーク不可などは無視
      }
    }
    check()
  }, [])

  function handleDismiss() {
    if (update) localStorage.setItem(LS_DISMISSED, update.latest)
    setDismissed(true)
  }

  if (!update || dismissed) return null

  return (
    <div className="update-banner">
      <span>🎉 新しいバージョン <strong>{update.latest}</strong> が利用可能です。</span>
      <a href={update.url} target="_blank" rel="noreferrer" className="update-link">
        ダウンロード
      </a>
      <button className="update-dismiss" onClick={handleDismiss}>✕</button>
    </div>
  )
}
