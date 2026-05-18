'use strict'

const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const http  = require('http')
const https = require('https')
const fs    = require('fs')

const isDev = !app.isPackaged
const PROXY_PORT = 57172
const DATA_FILE  = path.join(app.getPath('userData'), 'booth-data.json')

// ── データ永続化 IPC ────────────────────────────────────────────
ipcMain.handle('store:save', async (_, data) => {
  const tmp = DATA_FILE + '.tmp'
  try {
    await fs.promises.writeFile(tmp, JSON.stringify(data), 'utf-8')
    await fs.promises.rename(tmp, DATA_FILE)
    return { ok: true }
  } catch (e) {
    try { await fs.promises.unlink(tmp) } catch {}
    return { ok: false, error: e.message }
  }
})

ipcMain.handle('store:load', () => {
  try {
    if (!fs.existsSync(DATA_FILE)) return null
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return null
  }
})

ipcMain.handle('store:clear', () => {
  try {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── アプリバージョン IPC ────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion())

// ── Booth プロキシサーバー ──────────────────────────────────────
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
