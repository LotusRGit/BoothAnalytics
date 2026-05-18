import { useState } from 'react'
import { buildAnalysisPrompt } from '../utils/buildAnalysisPrompt'
import './AiAnalysis.css'

const MODEL = 'claude-haiku-4-5-20251001'

async function callClaude(apiKey, prompt) {
  if (typeof window !== 'undefined' && window.electronAPI?.analyzeWithClaude) {
    return window.electronAPI.analyzeWithClaude(apiKey, prompt)
  }
  const res = await fetch('/anthropic-api/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 apiKey,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `APIエラー: ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text
}

function renderBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  )
}

function MarkdownView({ text }) {
  const lines  = text.split('\n')
  const result = []
  let listBuf  = []

  const flush = () => {
    if (listBuf.length) {
      result.push(<ul key={`ul-${result.length}`}>{listBuf}</ul>)
      listBuf = []
    }
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flush()
      result.push(<h3 key={i}>{renderBold(line.slice(3))}</h3>)
    } else if (line.startsWith('### ')) {
      flush()
      result.push(<h4 key={i}>{renderBold(line.slice(4))}</h4>)
    } else if (/^[-*] /.test(line)) {
      listBuf.push(<li key={i}>{renderBold(line.slice(2))}</li>)
    } else if (/^\d+\. /.test(line)) {
      flush()
      result.push(<p key={i} className="ai-numbered">{renderBold(line)}</p>)
    } else if (line === '' || line === '---') {
      flush()
    } else {
      flush()
      result.push(<p key={i}>{renderBold(line)}</p>)
    }
  })
  flush()

  return <div className="ai-markdown">{result}</div>
}

// APIキー未設定時のセットアップ画面
function SetupScreen({ onSaved }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function save() {
    const k = input.trim()
    if (!k.startsWith('sk-ant-')) {
      setError('APIキーは「sk-ant-」から始まる文字列です。')
      return
    }
    localStorage.setItem('anthropic_api_key', k)
    onSaved(k)
  }

  return (
    <div className="card ai-setup-card">
      <div className="ai-setup-icon">🤖</div>
      <h2 className="ai-setup-title">AI売上分析を使う</h2>
      <p className="ai-setup-desc">
        Anthropic の API キーを登録すると、Claude が売上データを分析して
        トレンドや改善提案を教えてくれます。
      </p>

      <ol className="ai-setup-steps">
        <li>
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{' '}
          にアクセスしてアカウントを作成
        </li>
        <li>「API Keys」メニューから新しいキーを作成</li>
        <li>発行された <code>sk-ant-...</code> をコピーして下に貼り付け</li>
      </ol>

      <div className="ai-setup-input-wrap">
        <input
          type="password"
          className="ai-key-input"
          placeholder="sk-ant-api03-..."
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <button className="btn-primary" onClick={save}>登録して使う</button>
      </div>

      {error && <p className="ai-setup-error">{error}</p>}

      <p className="ai-setup-note">
        キーはこのアプリ内にのみ保存されます。外部に送信されることはありません
        （Claude API への接続を除く）。1回の分析あたり約 0.1〜0.3 円です。
      </p>
    </div>
  )
}

export default function AiAnalysis({ rows, firstSaleDates }) {
  const [savedKey, setSavedKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '')
  const [editing, setEditing]   = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState('')

  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)

  function handleSaved(key) {
    setSavedKey(key)
    setEditing(false)
  }

  function saveEdit() {
    const k = keyInput.trim()
    if (!k.startsWith('sk-ant-')) {
      setKeyError('APIキーは「sk-ant-」から始まります。')
      return
    }
    localStorage.setItem('anthropic_api_key', k)
    setSavedKey(k)
    setEditing(false)
    setKeyInput('')
    setKeyError('')
  }

  function deleteKey() {
    if (!confirm('APIキーを削除しますか？')) return
    localStorage.removeItem('anthropic_api_key')
    setSavedKey('')
    setResult(null)
    setError(null)
  }

  async function analyze() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let prompt = buildAnalysisPrompt(rows, firstSaleDates)
      if (question.trim()) {
        prompt += `\n\n特に以下の点を重点的に分析してください：\n${question.trim()}`
      }
      const text = await callClaude(savedKey, prompt)
      setResult(text)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // APIキー未設定
  if (!savedKey) {
    return <SetupScreen onSaved={handleSaved} />
  }

  // APIキー設定済み
  return (
    <div className="ai-analysis">
      <div className="card ai-main-card">
        <div className="card-header">
          <span className="card-title">🤖 AI売上分析</span>
          <div className="ai-key-status">
            <span className="ai-key-ok">✓ APIキー設定済み</span>
            {!editing && (
              <>
                <button className="ai-key-btn" onClick={() => { setEditing(true); setKeyInput('') }}>変更</button>
                <button className="ai-key-btn danger" onClick={deleteKey}>削除</button>
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="ai-edit-row">
            <input
              type="password"
              className="ai-key-input"
              placeholder="sk-ant-api03-..."
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError('') }}
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
              autoFocus
            />
            <button className="btn-primary" onClick={saveEdit}>保存</button>
            <button className="ai-key-btn" onClick={() => { setEditing(false); setKeyError('') }}>キャンセル</button>
            {keyError && <span className="ai-setup-error">{keyError}</span>}
          </div>
        )}

        <div className="ai-question-section">
          <label className="ai-question-label">追加で聞きたいこと <span className="ai-optional">（任意）</span></label>
          <textarea
            className="ai-question-input"
            rows={2}
            placeholder="例：どの商品の次回作を優先すべきか教えてください"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </div>

        <button className="ai-analyze-btn" onClick={analyze} disabled={loading}>
          {loading
            ? <><span className="ai-spinner" /> 分析中...</>
            : '🤖 分析を開始する'}
        </button>
      </div>

      {error && (
        <div className="card ai-error-card">
          <strong>エラー</strong>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="card ai-result-card">
          <div className="card-header">
            <span className="card-title">分析結果</span>
            <span className="ai-model-tag">{MODEL}</span>
          </div>
          <MarkdownView text={result} />
        </div>
      )}
    </div>
  )
}
