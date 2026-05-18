import { useMemo, useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import SalesSummary from './SalesSummary'
import SalesTrend from './SalesTrend'
import ProductRanking from './ProductRanking'
import MonthlyDetail from './MonthlyDetail'
import HeatMap from './HeatMap'
import DayOfMonthChart from './DayOfMonthChart'
import RepeatAnalysis from './RepeatAnalysis'
import './Dashboard.css'

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

export default function Dashboard({ data, fileName }) {
  const { rows } = data
  const [page, setPage]           = useState('overview')
  const [compareMode, setCompare] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef                 = useRef(null)

  // ── 商品一覧 & フィルター ──────────────────────────────────────
  const allProducts = useMemo(() =>
    [...new Set(rows.map(r => r.product))].sort(), [rows])
  const [selectedProducts, setSelectedProducts] = useState([])

  function toggleProduct(p) {
    setSelectedProducts(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  // ── 日付範囲（メイン） ─────────────────────────────────────────
  const [minDate, maxDate] = useMemo(() => {
    const dates = rows.map(r => r.date)
    return [
      toDateStr(new Date(Math.min(...dates))),
      toDateStr(new Date(Math.max(...dates))),
    ]
  }, [rows])

  const [startDate, setStartDate] = useState(minDate)
  const [endDate, setEndDate]     = useState(maxDate)

  // ── 日付範囲（比較用） ─────────────────────────────────────────
  const [cmpStart, setCmpStart] = useState(minDate)
  const [cmpEnd, setCmpEnd]     = useState(maxDate)

  // data が切り替わったとき（永続データ復元後を含む）に日付範囲をリセット
  useEffect(() => {
    setStartDate(minDate)
    setEndDate(maxDate)
    setCmpStart(minDate)
    setCmpEnd(maxDate)
  }, [minDate, maxDate])

  // ── フィルタリング ─────────────────────────────────────────────
  const filterRows = (src, start, end) => {
    const s = new Date(start)
    const e = new Date(end)
    e.setHours(23, 59, 59)
    const byDate = src.filter(r => r.date >= s && r.date <= e)
    if (selectedProducts.length === 0) return byDate
    return byDate.filter(r => selectedProducts.includes(r.product))
  }

  const filtered    = useMemo(() => filterRows(rows, startDate, endDate),
    [rows, startDate, endDate, selectedProducts])
  const filteredCmp = useMemo(() => filterRows(rows, cmpStart, cmpEnd),
    [rows, cmpStart, cmpEnd, selectedProducts])

  // 初回売上日（全データから算出）
  const firstSaleDates = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const cur = map.get(r.product)
      if (!cur || r.date < cur) map.set(r.product, r.date)
    }
    return map
  }, [rows])

  // ── PNG エクスポート ───────────────────────────────────────────
  async function handleExport() {
    if (!exportRef.current || exporting) return
    setExporting(true)
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--card').trim() || '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      const suffix = compareMode
        ? `${startDate}-${endDate}_vs_${cmpStart}-${cmpEnd}`
        : `${startDate}-${endDate}`
      link.download = `booth-analytics-${suffix}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  function resetDateRange() {
    setStartDate(minDate)
    setEndDate(maxDate)
  }

  // ── 期間プリセット ─────────────────────────────────────────────
  // データ範囲にクランプした上で、重なりがなければ null を返す
  function clamp(dateStr) {
    if (dateStr < minDate) return minDate
    if (dateStr > maxDate) return maxDate
    return dateStr
  }

  const datePresets = useMemo(() => {
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth() + 1
    const pad   = n => String(n).padStart(2, '0')

    const lastMonthDate = new Date(year, month - 2, 1)
    const lastMonthYear = lastMonthDate.getFullYear()
    const lastMonth     = lastMonthDate.getMonth() + 1
    const lastMonthEnd  = new Date(year, month - 1, 0)

    const candidates = [
      {
        label: '今月',
        start: `${year}-${pad(month)}-01`,
        end:   `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`,
      },
      {
        label: '先月',
        start: `${lastMonthYear}-${pad(lastMonth)}-01`,
        end:   `${lastMonthYear}-${pad(lastMonth)}-${pad(lastMonthEnd.getDate())}`,
      },
      {
        label: '今年',
        start: `${year}-01-01`,
        end:   `${year}-12-31`,
      },
      {
        label: '去年',
        start: `${year - 1}-01-01`,
        end:   `${year - 1}-12-31`,
      },
    ]

    // データ範囲と重なるプリセットのみ表示（クランプ後に start > end になるものは除外）
    return candidates
      .map(p => ({ ...p, start: clamp(p.start), end: clamp(p.end) }))
      .filter(p => p.start <= p.end)
  }, [minDate, maxDate])

  function applyPreset(preset) {
    setStartDate(preset.start)
    setEndDate(preset.end)
  }

  // 現在の選択がプリセットと一致するか判定
  function isPresetActive(preset) {
    return startDate === preset.start && endDate === preset.end
  }

  return (
    <div className="dashboard">
      {/* ── トップバー ── */}
      <div className="dashboard-topbar">
        <div className="file-tag">📄 {fileName} — {rows.length.toLocaleString()} 件</div>

        <div className="topbar-controls">
          {/* 日付フィルター */}
          <div className="date-filter">
            <label>期間：</label>
            {datePresets.map(p => (
              <button
                key={p.label}
                className={`btn-preset ${isPresetActive(p) ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
            <input type="date" value={startDate} min={minDate} max={endDate}
              onChange={e => setStartDate(e.target.value)} />
            <span>〜</span>
            <input type="date" value={endDate} min={startDate} max={maxDate}
              onChange={e => setEndDate(e.target.value)} />
            <button className="btn-reset-date" onClick={resetDateRange}>全期間</button>
          </div>

          {/* 比較モード */}
          <button
            className={`btn-compare ${compareMode ? 'active' : ''}`}
            onClick={() => setCompare(m => !m)}
          >
            ⇄ 比較
          </button>

          {/* エクスポート */}
          <button className="btn-export" onClick={handleExport} disabled={exporting} title="PNG で保存">
            {exporting ? '⏳' : '↓ PNG'}
          </button>
        </div>
      </div>

      {/* ── 比較期間セレクター ── */}
      {compareMode && (
        <div className="compare-bar">
          <span className="compare-label">比較期間：</span>
          <input type="date" value={cmpStart} min={minDate} max={cmpEnd}
            onChange={e => setCmpStart(e.target.value)} />
          <span>〜</span>
          <input type="date" value={cmpEnd} min={cmpStart} max={maxDate}
            onChange={e => setCmpEnd(e.target.value)} />
        </div>
      )}

      {/* ── 商品フィルター ── */}
      {allProducts.length > 1 && (
        <div className="product-filter">
          <span className="filter-label">商品：</span>
          <div className="filter-chips">
            <button
              className={`chip ${selectedProducts.length === 0 ? 'active' : ''}`}
              onClick={() => setSelectedProducts([])}
            >すべて</button>
            {allProducts.map(p => (
              <button
                key={p}
                className={`chip ${selectedProducts.includes(p) ? 'active' : ''}`}
                onClick={() => toggleProduct(p)}
                title={p}
              >
                {p.length > 20 ? p.slice(0, 18) + '…' : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ページナビ ── */}
      <div className="page-nav">
        {[
          { id: 'overview', label: '全体レポート' },
          { id: 'monthly',  label: '月次レポート' },
          { id: 'heatmap',  label: '時間帯分析'   },
          { id: 'repeat',   label: 'リピーター'   },
        ].map(p => (
          <button
            key={p.id}
            className={`page-nav-btn ${page === p.id ? 'active' : ''}`}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── コンテンツ（エクスポート対象） ── */}
      <div ref={exportRef}>
        {compareMode ? (
          <div className="compare-grid">
            <div className="compare-col">
              <div className="compare-col-label">
                📅 {startDate} 〜 {endDate}
              </div>
              <SalesSummary rows={filtered} />
              {page === 'overview' && (
                <>
                  <SalesTrend rows={filtered} firstSaleDates={firstSaleDates} />
                  <ProductRanking rows={filtered} firstSaleDates={firstSaleDates} />
                </>
              )}
            </div>
            <div className="compare-col">
              <div className="compare-col-label">
                📅 {cmpStart} 〜 {cmpEnd}
              </div>
              <SalesSummary rows={filteredCmp} />
              {page === 'overview' && (
                <>
                  <SalesTrend rows={filteredCmp} firstSaleDates={firstSaleDates} />
                  <ProductRanking rows={filteredCmp} firstSaleDates={firstSaleDates} />
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {page === 'overview' && (
              <>
                <SalesSummary rows={filtered} />
                <SalesTrend rows={filtered} firstSaleDates={firstSaleDates} />
                <ProductRanking rows={filtered} firstSaleDates={firstSaleDates} />
              </>
            )}
            {page === 'monthly' && <MonthlyDetail rows={filtered} firstSaleDates={firstSaleDates} />}
            {page === 'heatmap' && (
              <>
                <HeatMap rows={filtered} />
                <DayOfMonthChart rows={filtered} />
              </>
            )}
            {page === 'repeat' && <RepeatAnalysis rows={filtered} />}
          </>
        )}
      </div>
    </div>
  )
}
