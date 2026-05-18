import { useState } from 'react'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import './App.css'

export default function App() {
  const [data, setData] = useState(null)
  const [fileName, setFileName] = useState('')

  function handleData(parsed, name) {
    setData(parsed)
    setFileName(name)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <span className="header-logo">📊</span>
            <h1>Booth 売上分析</h1>
          </div>
          {data && (
            <button className="btn-secondary" onClick={() => setData(null)}>
              別のCSVを読み込む
            </button>
          )}
        </div>
      </header>
      <main className="app-main">
        {!data
          ? <FileUpload onData={handleData} />
          : <Dashboard data={data} fileName={fileName} />
        }
      </main>
    </div>
  )
}
