import { useState, useRef, useEffect } from 'react'
import './ProductFilterDropdown.css'

export default function ProductFilterDropdown({ products, selected, onChange }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const containerRef          = useRef(null)

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = products.filter(p =>
    p.toLowerCase().includes(query.toLowerCase())
  )

  const allSelected  = selected.length === 0
  const someSelected = selected.length > 0

  function toggleProduct(p) {
    onChange(
      selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p]
    )
  }

  function toggleAll() {
    onChange([])
  }

  const label = allSelected
    ? 'すべての商品'
    : `${selected.length} 件を選択中`

  return (
    <div className="pf-container" ref={containerRef}>
      <button
        className={`pf-trigger ${someSelected ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="pf-icon">📦</span>
        <span className="pf-label">{label}</span>
        <span className="pf-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="pf-dropdown">
          <div className="pf-search-wrap">
            <span className="pf-search-icon">🔍</span>
            <input
              className="pf-search"
              type="text"
              placeholder="商品を検索..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="pf-clear-query" onClick={() => setQuery('')}>✕</button>
            )}
          </div>

          <div className="pf-list">
            {/* すべて選択行（検索中は非表示） */}
            {!query && (
              <label className="pf-item pf-item-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                <span>すべて</span>
                <span className="pf-count">{products.length} 件</span>
              </label>
            )}

            {filtered.length === 0 && (
              <div className="pf-empty">該当なし</div>
            )}

            {filtered.map(p => (
              <label key={p} className="pf-item" title={p}>
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={() => toggleProduct(p)}
                />
                <span className="pf-name">{p}</span>
              </label>
            ))}
          </div>

          {someSelected && (
            <div className="pf-footer">
              <button className="pf-reset" onClick={() => { onChange([]); setQuery('') }}>
                選択を解除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
