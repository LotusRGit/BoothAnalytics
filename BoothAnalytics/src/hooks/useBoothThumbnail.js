import { useState, useEffect } from 'react'

// Electron 本番: window.BOOTH_PROXY_PORT が preload でセットされる
// Electron 開発 / ブラウザ開発: undefined → Vite プロキシ or 相対パス
const PROXY_BASE =
  typeof window !== 'undefined' && window.BOOTH_PROXY_PORT
    ? `http://localhost:${window.BOOTH_PROXY_PORT}`
    : ''

const cache   = new Map()
const pending = new Map()

async function fetchThumbnail(itemId) {
  if (cache.has(itemId))   return cache.get(itemId)
  if (pending.has(itemId)) return pending.get(itemId)

  const promise = fetch(`${PROXY_BASE}/booth-page/${itemId}`, {
    headers: { Accept: 'text/html' },
  })
    .then(r => (r.ok ? r.text() : null))
    .then(html => {
      if (!html) { cache.set(itemId, null); pending.delete(itemId); return null }

      const m =
        html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/) ||
        html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/)

      const url = m?.[1] ?? null
      cache.set(itemId, url)
      pending.delete(itemId)
      return url
    })
    .catch(() => {
      cache.set(itemId, null)
      pending.delete(itemId)
      return null
    })

  pending.set(itemId, promise)
  return promise
}

export function useBoothThumbnail(itemId, directUrl) {
  const [url, setUrl] = useState(directUrl || null)

  useEffect(() => {
    if (directUrl) { setUrl(directUrl); return }
    if (!itemId)   return

    if (cache.has(itemId)) { setUrl(cache.get(itemId)); return }

    fetchThumbnail(itemId).then(setUrl)
  }, [itemId, directUrl])

  return url
}
