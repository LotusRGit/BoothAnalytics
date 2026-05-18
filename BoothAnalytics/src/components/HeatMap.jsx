import React, { useMemo, useState } from 'react'
import './HeatMap.css'

const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function HeatMap({ rows }) {
  const [metric, setMetric] = useState('orders')
  const [hovered, setHovered] = useState(null)

  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ orders: 0, revenue: 0 }))
    )
    for (const r of rows) {
      const dow = (r.date.getDay() + 6) % 7 // JS: 0=日 → 0=月 に変換
      const hour = r.date.getHours()
      g[dow][hour].orders += 1
      g[dow][hour].revenue += r.amount
    }
    return g
  }, [rows])

  const maxVal = useMemo(() => {
    let m = 0
    for (const row of grid)
      for (const cell of row)
        m = Math.max(m, metric === 'orders' ? cell.orders : cell.revenue)
    return m || 1
  }, [grid, metric])

  function cellStyle(val) {
    if (val === 0) return { background: '#f1f5f9' }
    const t = val / maxVal
    return {
      background: `rgba(79, 70, 229, ${0.12 + t * 0.88})`,
      color: t > 0.55 ? 'white' : '#475569',
    }
  }

  const hoveredCell = hovered ? grid[hovered.day][hovered.hour] : null

  if (rows.length === 0) return null

  return (
    <div className="card heatmap-card">
      <div className="card-header">
        <span className="card-title">曜日・時間帯ヒートマップ</span>
        <div className="period-toggle">
          <button className={metric === 'orders'  ? 'active' : ''} onClick={() => setMetric('orders')}>注文数</button>
          <button className={metric === 'revenue' ? 'active' : ''} onClick={() => setMetric('revenue')}>売上</button>
        </div>
      </div>

      <div className="heatmap-wrap">
        <div className="heatmap-grid">
          {/* 1行目：コーナー + 時間ラベル */}
          <div className="heatmap-corner" />
          {HOURS.map(h => (
            <div key={h} className="heatmap-hour-label">{h}</div>
          ))}

          {/* 2〜8行目：曜日ラベル + データセル */}
          {DAYS.map((day, di) => (
            <React.Fragment key={di}>
              <div className={`heatmap-day-label ${di >= 5 ? 'weekend' : ''}`}>{day}</div>
              {HOURS.map(h => {
                const cell = grid[di][h]
                const val = metric === 'orders' ? cell.orders : cell.revenue
                return (
                  <div
                    key={h}
                    className="heatmap-cell"
                    style={cellStyle(val)}
                    onMouseEnter={() => setHovered({ day: di, hour: h })}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ホバー情報 */}
      <div className="heatmap-info">
        {hovered && hoveredCell ? (
          <span>
            <strong>{DAYS[hovered.day]}曜日 {hovered.hour}時台</strong>
            　注文 {hoveredCell.orders} 件
            　売上 ¥{Math.round(hoveredCell.revenue).toLocaleString('ja-JP')}
          </span>
        ) : (
          <span className="heatmap-hint">セルにカーソルを合わせると詳細が表示されます</span>
        )}
      </div>

      {/* 凡例 */}
      <div className="heatmap-legend">
        <span className="legend-text">少</span>
        <div className="legend-bar">
          {[0.12, 0.35, 0.55, 0.75, 1.0].map(a => (
            <div key={a} style={{ background: `rgba(79,70,229,${a})` }} />
          ))}
        </div>
        <span className="legend-text">多</span>
      </div>
    </div>
  )
}
