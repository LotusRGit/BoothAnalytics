import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import UpdateBanner from './components/UpdateBanner'
import './App.css'

// Date オブジェクトを JSON にシリアライズ / 復元
function serializeData(data) {
  return {
    ...data,
    rows: data.rows.map(r => ({ ...r, date: r.date.toISOString() })),
  }
}
function deserializeData(raw) {
  return {
    ...raw,
    rows: raw.rows.map(r => ({ ...r, date: new Date(r.date) })),
  }
}

export default function App() {
  const [data, setData]         = useState(null)
  const [fileName, setFileName] = useState('')
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )

  // ダークモード: data-theme を root に適用
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // 起動時に永続データを復元（Electron のみ）
  useEffect(() => {
    if (!window.boothStore) return
    window.boothStore.load().then(raw => {
      if (!raw) return
      try {
        setData(deserializeData(raw.data))
        setFileName(raw.fileName)
      } catch {
        window.boothStore.clear()
      }
    })
  }, [])

  function handleData(parsed, name) {
    setData(parsed)
    setFileName(name)
    if (window.boothStore) {
      window.boothStore.save({ data: serializeData(parsed), fileName: name })
    }
  }

  function handleReset() {
    setData(null)
    setFileName('')
    if (window.boothStore) window.boothStore.clear()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-logo">📊</span>
            <h1>Booth 売上分析</h1>
          </div>
          <div className="header-actions">
            {data && (
              <button className="btn-secondary" onClick={handleReset}>
                別のCSVを読み込む
              </button>
            )}
            <button
              className="btn-icon"
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'ライトモード' : 'ダークモード'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>
      <UpdateBanner />
      <main className="app-main">
        {!data
          ? <FileUpload onData={handleData} />
          : <Dashboard data={data} fileName={fileName} />
        }
      </main>
    </div>
  )
}
