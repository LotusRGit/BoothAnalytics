import { useMemo, useState } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import './DayOfMonthChart.css'

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="dom-tooltip">
      <div className="dom-tooltip-label">{label}日</div>
      <div className="dom-tooltip-value">
        {metric === 'orders' ? `${d.orders} 件` : fmt(d.revenue)}
      </div>
      <div className="dom-tooltip-sub">{d.monthCount} ヶ月分の合計</div>
    </div>
  )
}

export default function DayOfMonthChart({ rows }) {
  const [metric, setMetric] = useState('orders')

  const dayStats = useMemo(() => {
    const arr = Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      orders: 0,
      revenue: 0,
      months: new Set(),
    }))
    for (const r of rows) {
      const idx = r.date.getDate() - 1
      arr[idx].orders += 1
      arr[idx].revenue += r.amount
      arr[idx].months.add(`${r.date.getFullYear()}-${r.date.getMonth()}`)
    }
    return arr.map(d => ({ ...d, monthCount: d.months.size }))
  }, [rows])

  const getValue = d => metric === 'orders' ? d.orders : d.revenue
  const maxVal = Math.max(...dayStats.map(getValue)) || 1
  const topDay = dayStats.reduce((best, d) => getValue(d) > getValue(best) ? d : best, dayStats[0])

  if (rows.length === 0) return null

  return (
    <div className="card dom-card">
      <div className="card-header">
        <div className="dom-title-group">
          <span className="card-title">日付別の購入傾向</span>
          <span className="dom-top-stat">
            最多: <strong>{topDay.day}日</strong>
            （{metric === 'orders' ? `${topDay.orders} 件` : fmt(topDay.revenue)}）
          </span>
        </div>
        <div className="period-toggle">
          <button className={metric === 'orders'  ? 'active' : ''} onClick={() => setMetric('orders')}>注文数</button>
          <button className={metric === 'revenue' ? 'active' : ''} onClick={() => setMetric('revenue')}>売上</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dayStats} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="day"
            tickFormatter={d => `${d}`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tickFormatter={v => metric === 'revenue'
              ? '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
              : v}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ fill: 'rgba(79,70,229,0.06)' }} />
          <Bar dataKey={metric} radius={[3, 3, 0, 0]}>
            {dayStats.map((d, i) => (
              <Cell
                key={i}
                fill={getValue(d) === maxVal ? '#f59e0b' : '#4f46e5'}
                opacity={getValue(d) === 0 ? 0.15 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="dom-note">
        ※ 29・30・31日はその日が存在する月のみ集計されます（データ期間: {new Set(rows.map(r => `${r.date.getFullYear()}-${r.date.getMonth()}`)).size} ヶ月）
      </p>
    </div>
  )
}
