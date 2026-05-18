import { useMemo, useState } from 'react'
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
  const [page, setPage] = useState('overview')

  const [minDate, maxDate] = useMemo(() => {
    const dates = rows.map(r => r.date)
    return [
      toDateStr(new Date(Math.min(...dates))),
      toDateStr(new Date(Math.max(...dates))),
    ]
  }, [rows])

  const [startDate, setStartDate] = useState(minDate)
  const [endDate, setEndDate] = useState(maxDate)

  const filtered = useMemo(() => {
    const s = new Date(startDate)
    const e = new Date(endDate)
    e.setHours(23, 59, 59)
    return rows.filter(r => r.date >= s && r.date <= e)
  }, [rows, startDate, endDate])

  // 全データから商品ごとの初回売上日を算出（フィルター影響なし）
  const firstSaleDates = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const cur = map.get(r.product)
      if (!cur || r.date < cur) map.set(r.product, r.date)
    }
    return map
  }, [rows])

  function resetDateRange() {
    setStartDate(minDate)
    setEndDate(maxDate)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-topbar">
        <div className="file-tag">📄 {fileName} — {rows.length.toLocaleString()} 件のデータ</div>
        <div className="date-filter">
          <label>期間：</label>
          <input
            type="date"
            value={startDate}
            min={minDate}
            max={endDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <span>〜</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={maxDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <button className="btn-reset-date" onClick={resetDateRange}>全期間</button>
        </div>
      </div>

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
      {page === 'repeat'  && <RepeatAnalysis rows={filtered} />}
    </div>
  )
}
