'use strict'

const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const http  = require('http')
const https = require('https')

const isDev = !app.isPackaged
const PROXY_PORT = 57172

// ── Booth プロキシサーバー ──────────────────────────────────────
// booth.pm/ja/items/{id} の HTML を取得して返す（og:image 抽出用）
function startProxyServer(callback) {
  function fetchWithRedirect(urlStr, res, hop = 0) {
    if (hop > 5) { res.writeHead(500); res.end(); return }

    const u = new URL(urlStr)
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml',
      },
    }, proxyRes => {
      if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
        const loc = proxyRes.headers.location
        if (loc) {
          const next = loc.startsWith('http') ? loc : `https://${u.hostname}${loc}`
          proxyRes.resume()
          fetchWithRedirect(next, res, hop + 1)
          return
        }
      }
      res.writeHead(proxyRes.statusCode, {
        'Content-Type':                proxyRes.headers['content-type'] ?? 'text/html',
        'Access-Control-Allow-Origin': '*',
      })
      proxyRes.pipe(res)
    })

    req.on('error', () => { res.writeHead(500); res.end() })
    req.end()
  }

  const server = http.createServer((req, res) => {
    const m = req.url.match(/^\/booth-page\/(\d+)$/)
    if (!m) { res.writeHead(404); res.end(); return }
    fetchWithRedirect(`https://booth.pm/ja/items/${m[1]}`, res)
  })

  server.listen(PROXY_PORT, '127.0.0.1', () => callback())
}

// ── ウィンドウ ──────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:  1280,
    height: 820,
    minWidth:  900,
    minHeight: 600,
    title: 'Booth Analytics',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  })

  // 外部リンクはブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── 起動 ────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startProxyServer(() => {
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
