import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import './SalesTrend.css'

function toYearMonth(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toYearMonthDay(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function fmtYen(v) {
  return '¥' + Math.round(v).toLocaleString('ja-JP')
}

function CustomTooltip({ active, payload, label, releaseMap }) {
  if (!active || !payload?.length) return null
  const released = releaseMap?.get(label)
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value">{fmtYen(payload[0].value)}</div>
      <div className="tooltip-sub">{payload[1]?.value} 件</div>
      {released && (
        <div className="tooltip-release">
          📦 初回売上: {released.map(p =>
            p.length > 18 ? p.slice(0, 18) + '…' : p
          ).join(' / ')}
        </div>
      )}
    </div>
  )
}

// 縦線の上端に出る小さなラベル
function ReleaseLineLabel({ viewBox, names }) {
  if (!viewBox) return null
  const { x, y } = viewBox
  const text = names.length === 1
    ? (names[0].length > 14 ? names[0].slice(0, 14) + '…' : names[0])
    : `${names.length} 商品`
  return (
    <text
      x={x + 4}
      y={y + 12}
      fill="#d97706"
      fontSize={9}
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {text}
    </text>
  )
}

export default function SalesTrend({ rows, firstSaleDates }) {
  const [period, setPeriod] = useState('monthly')
  const [showReleases, setShowReleases] = useState(false)

  const chartData = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = period === 'monthly' ? toYearMonth(r.date) : toYearMonthDay(r.date)
      const entry = map.get(key) || { label: key, revenue: 0, orders: 0 }
      entry.revenue += r.amount
      entry.orders += 1
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [rows, period])

  // 日付ラベル → 商品名[] のマップ（チャートのX軸フォーマットに合わせる）
  const releaseMap = useMemo(() => {
    if (!firstSaleDates) return new Map()
    const map = new Map()
    for (const [product, date] of firstSaleDates) {
      const label = period === 'monthly' ? toYearMonth(date) : toYearMonthDay(date)
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(product)
    }
    return map
  }, [firstSaleDates, period])

  // チャートの表示範囲内にある発売日のみ絞り込む
  const releaseLines = useMemo(() => {
    if (!showReleases) return []
    const chartLabels = new Set(chartData.map(d => d.label))
    return Array.from(releaseMap.entries())
      .filter(([label]) => chartLabels.has(label))
  }, [releaseMap, chartData, showReleases])

  if (rows.length === 0) return null

  return (
    <div className="card trend-card">
      <div className="card-header">
        <span className="card-title">売上推移</span>
        <div className="trend-controls">
          <button
            className={`release-toggle ${showReleases ? 'active' : ''}`}
            onClick={() => setShowReleases(v => !v)}
            title="商品の初回売上日を表示"
          >
            📦 発売日
          </button>
          <div className="period-toggle">
            <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>月別</button>
            <button className={period === 'daily'   ? 'active' : ''} onClick={() => setPeriod('daily')}>日別</button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={v => '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip releaseMap={showReleases ? releaseMap : null} />} />

          {/* 発売日の縦線 */}
          {releaseLines.map(([label, names]) => (
            <ReferenceLine
              key={label}
              x={label}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={<ReleaseLineLabel names={names} />}
            />
          ))}

          <Line
            type="monotone"
            dataKey="revenue"
            name="売上"
            stroke="#4f46e5"
            strokeWidth={2.5}
            dot={chartData.length <= 31 ? { r: 3, fill: '#4f46e5' } : false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            name="注文数"
            stroke="#e2e8f0"
            strokeWidth={0}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
