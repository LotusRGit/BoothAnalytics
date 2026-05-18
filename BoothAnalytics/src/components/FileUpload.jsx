import { useState, useCallback, useRef } from 'react'
import { parseBoothCSV, mergeBoothCSVs } from '../utils/parseBoothCSV'
import './FileUpload.css'

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error(`読み込み失敗: ${file.name}`))
    reader.readAsText(file, 'UTF-8')
  })
}

export default function FileUpload({ onData }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null) // { current, total }
  const folderInputRef = useRef(null)

  async function processFolderFiles(fileList) {
    const csvFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv'))
    if (csvFiles.length === 0) {
      setError('フォルダ内にCSVファイルが見つかりませんでした。')
      return
    }

    setError(null)
    setProgress({ current: 0, total: csvFiles.length })

    const results = []
    const errors = []

    for (let i = 0; i < csvFiles.length; i++) {
      const file = csvFiles[i]
      setProgress({ current: i + 1, total: csvFiles.length, fileName: file.name })
      try {
        const text = await readFileAsText(file)
        const parsed = parseBoothCSV(text)
        results.push(parsed)
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`)
      }
    }

    setProgress(null)

    if (results.length === 0) {
      setError('有効なCSVが1件もありませんでした。\n' + errors.join('\n'))
      return
    }

    const merged = mergeBoothCSVs(results)
    const folderName = csvFiles[0].webkitRelativePath.split('/')[0] || 'フォルダ'
    const label = `${folderName} (${results.length}件のCSV)`
    if (errors.length > 0) {
      setError(`⚠️ ${errors.length}件のCSVをスキップしました:\n${errors.join('\n')}`)
    }
    onData(merged, label)
  }

  async function processSingleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setError('CSVファイルを選択してください。')
      return
    }
    setError(null)
    setProgress({ current: 1, total: 1, fileName: file.name })
    try {
      const text = await readFileAsText(file)
      const parsed = parseBoothCSV(text)
      onData(parsed, file.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setProgress(null)
    }
  }

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const items = e.dataTransfer.items
    // フォルダがドロップされた場合
    if (items && items.length > 0 && items[0].webkitGetAsEntry?.()?.isDirectory) {
      setError('フォルダのドラッグ&ドロップは非対応です。「フォルダを選択」ボタンを使ってください。')
      return
    }
    const file = e.dataTransfer.files[0]
    processSingleFile(file)
  }, [])

  const onDragOver = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])

  const isLoading = progress !== null

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Booth 売上CSVを読み込む</h2>
        <p className="upload-desc">
          フォルダを指定すると、中の全CSVを自動で結合して分析します。
        </p>

        {/* フォルダ選択 */}
        <button
          className="folder-btn"
          disabled={isLoading}
          onClick={() => folderInputRef.current?.click()}
        >
          <span className="folder-btn-icon">📁</span>
          フォルダを選択して全CSV読み込み
        </button>
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          multiple
          accept=".csv"
          className="file-input-hidden"
          onChange={e => processFolderFiles(e.target.files)}
          disabled={isLoading}
        />

        <div className="divider"><span>または</span></div>

        {/* 単一ファイル */}
        <label
          className={`drop-zone ${dragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input
            type="file"
            accept=".csv"
            className="file-input"
            onChange={e => processSingleFile(e.target.files[0])}
            disabled={isLoading}
          />
          {isLoading ? (
            <div className="upload-state">
              <div className="spinner" />
              <div>
                <p className="upload-main">読み込み中... ({progress.current}/{progress.total})</p>
                {progress.fileName && (
                  <p className="upload-sub">{progress.fileName}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="upload-state">
              <div className="upload-icon">📄</div>
              <p className="upload-main">CSVをドラッグ&ドロップ</p>
              <p className="upload-sub">または クリックして1ファイル選択</p>
            </div>
          )}
        </label>

        {error && (
          <div className={`error-box ${error.startsWith('⚠️') ? 'warn' : ''}`}>
            <strong>{error.startsWith('⚠️') ? '注意' : '読み込みエラー'}</strong>
            <pre>{error.replace('⚠️ ', '')}</pre>
          </div>
        )}

        <div className="upload-hint">
          <strong>対応CSVの列（自動判別）</strong>
          <ul>
            <li>日付: 注文日時、購入日時</li>
            <li>商品: 商品名、商品名称</li>
            <li>金額: 小計、単価×数量、決済金額</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
