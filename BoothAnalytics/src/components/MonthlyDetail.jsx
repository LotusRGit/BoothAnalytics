import { useMemo, useState, useRef, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import Thumbnail from './Thumbnail'
import './MonthlyDetail.css'

function toYM(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function fmtDate(date) {
  if (!date) return null
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function CustomTooltip({ active, payload, label, releaseMap }) {
  if (!active || !payload?.length) return null
  const released = releaseMap?.get(label)
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}日</div>
      <div className="tooltip-value">{fmt(payload[0].value)}</div>
      {released && (
        <div className="tooltip-release">
          📦 {released.map(p => p.length > 16 ? p.slice(0, 16) + '…' : p).join(' / ')}
        </div>
      )}
    </div>
  )
}

function ReleaseLineLabel({ viewBox, names }) {
  if (!viewBox) return null
  const { x, y } = viewBox
  const text = names.length === 1
    ? (names[0].length > 12 ? names[0].slice(0, 12) + '…' : names[0])
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

export default function MonthlyDetail({ rows, firstSaleDates }) {
  const months = useMemo(() => {
    const set = new Set(rows.map(r => toYM(r.date)))
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [rows])

  const [selectedMonth, setSelectedMonth] = useState(() => months[0] || '')
  const [showReleases, setShowReleases] = useState(false)

  const activeTabRef = useRef(null)
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedMonth])

  const monthRows = useMemo(
    () => rows.filter(r => toYM(r.date) === selectedMonth),
    [rows, selectedMonth],
  )

  const stats = useMemo(() => {
    const total = monthRows.reduce((s, r) => s + r.amount, 0)
    const orderIds = new Set(monthRows.map(r => r.orderId).filter(Boolean))
    const orderCount = orderIds.size > 0 ? orderIds.size : monthRows.length
    const products = new Set(monthRows.map(r => r.product))
    return {
      total,
      orderCount,
      avgOrder: orderCount > 0 ? total / orderCount : 0,
      productCount: products.size,
    }
  }, [monthRows])

  const products = useMemo(() => {
    const map = new Map()
    for (const r of monthRows) {
      const e = map.get(r.product) || { name: r.product, revenue: 0, quantity: 0, itemId: null, imageUrl: null }
      e.revenue += r.amount
      e.quantity += r.quantity
      if (!e.itemId && r.itemId) e.itemId = r.itemId
      if (!e.imageUrl && r.imageUrl) e.imageUrl = r.imageUrl
      map.set(r.product, e)
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        ...p,
        firstSaleDate: firstSaleDates?.get(p.name) ?? null,
      }))
  }, [monthRows, firstSaleDates])

  const dailyData = useMemo(() => {
    const map = new Map()
    for (const r of monthRows) {
      const day = r.date.getDate()
      const e = map.get(day) || { day, revenue: 0 }
      e.revenue += r.amount
      map.set(day, e)
    }
    return Array.from(map.values()).sort((a, b) => a.day - b.day)
  }, [monthRows])

  // 選択中の月に初回売上がある商品を日付でグループ化
  const releaseMap = useMemo(() => {
    if (!firstSaleDates) return new Map()
    const map = new Map() // day (number) -> [product names]
    for (const [product, date] of firstSaleDates) {
      if (toYM(date) === selectedMonth) {
        const day = date.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day).push(product)
      }
    }
    return map
  }, [firstSaleDates, selectedMonth])

  const releaseLines = useMemo(() => (
    showReleases ? Array.from(releaseMap.entries()) : []
  ), [releaseMap, showReleases])

  if (months.length === 0) {
    return <div className="monthly-empty">表示できるデータがありません。</div>
  }

  const currentIdx = months.indexOf(selectedMonth)
  const top = products[0] ?? null
  const rest = products.slice(1)

  return (
    <div className="monthly-detail">

      {/* 月ナビゲーション */}
      <div className="month-nav">
        <button
          className="month-arrow"
          disabled={currentIdx <= 0}
          onClick={() => setSelectedMonth(months[currentIdx - 1])}
        >←</button>

        <div className="month-tabs-scroll">
          {months.map(m => (
            <button
              key={m}
              ref={m === selectedMonth ? activeTabRef : null}
              className={`month-tab ${m === selectedMonth ? 'active' : ''}`}
              onClick={() => setSelectedMonth(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          className="month-arrow"
          disabled={currentIdx >= months.length - 1}
          onClick={() => setSelectedMonth(months[currentIdx + 1])}
        >→</button>
      </div>

      {/* KPI */}
      <div className="monthly-kpi-grid">
        {[
          { label: '月間売上', value: fmt(stats.total),         color: '#4f46e5' },
          { label: '注文数',   value: `${stats.orderCount} 件`, color: '#0ea5e9' },
          { label: '平均単価', value: fmt(stats.avgOrder),       color: '#10b981' },
          { label: '商品種類', value: `${stats.productCount} 種`,color: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className="monthly-kpi-card" style={{ '--accent': c.color }}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 日別グラフ ＋ 1位商品 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">日別売上 — {selectedMonth}</span>
          {releaseMap.size > 0 && (
            <button
              className={`release-toggle ${showReleases ? 'active' : ''}`}
              onClick={() => setShowReleases(v => !v)}
            >
              📦 発売日 ({releaseMap.size}件)
            </button>
          )}
        </div>
        <div className="chart-top-layout">

          <div className="chart-area">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyData} margin={{ top: 16, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  tickFormatter={d => `${d}日`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={v => '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<CustomTooltip releaseMap={showReleases ? releaseMap : null} />} />

                {releaseLines.map(([day, names]) => (
                  <ReferenceLine
                    key={day}
                    x={day}
                    stroke="#f59e0b"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={<ReleaseLineLabel names={names} />}
                  />
                ))}

                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {top && (
            <div className="top1-panel">
              <div className="top1-thumb-wrap">
                <Thumbnail
                  imageUrl={top.imageUrl}
                  itemId={top.itemId}
                  alt={top.name}
                  className="product-thumb"
                />
                <span className="top1-crown">👑</span>
              </div>
              <div className="top1-body">
                <div className="top1-label-row">
                  <span className="top1-label">今月の1位</span>
                  {top.firstSaleDate && toYM(top.firstSaleDate) === selectedMonth && (
                    <span className="new-badge">NEW</span>
                  )}
                </div>
                <p className="top1-name" title={top.name}>{top.name}</p>
                <p className="top1-revenue">{fmt(top.revenue)}</p>
                <p className="top1-qty">{Math.round(top.quantity).toLocaleString()} 件</p>
                {top.firstSaleDate && (
                  <p className="top1-first-sale">📅 初回売上: {fmtDate(top.firstSaleDate)}</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2位以下のグリッド */}
      {rest.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">その他の商品</span>
            <span className="product-total-badge">{rest.length} 商品</span>
          </div>
          <div className="product-grid">
            {rest.map((p, i) => (
              <div key={p.name} className={`product-card ${i === 0 ? 'top-2' : i === 1 ? 'top-3' : ''}`}>
                <div className="product-thumb-wrap">
                  <Thumbnail
                    imageUrl={p.imageUrl}
                    itemId={p.itemId}
                    alt={p.name}
                    className="product-thumb"
                  />
                  <span className="product-rank">#{i + 2}</span>
                </div>
                <div className="product-card-body">
                  <div className="product-card-name-row">
                    <p className="product-card-name" title={p.name}>{p.name}</p>
                    {p.firstSaleDate && toYM(p.firstSaleDate) === selectedMonth && (
                      <span className="new-badge">NEW</span>
                    )}
                  </div>
                  <p className="product-card-revenue">{fmt(p.revenue)}</p>
                  <p className="product-card-qty">{Math.round(p.quantity).toLocaleString()} 件</p>
                  {p.firstSaleDate && (
                    <p className="product-card-first-sale">📅 {fmtDate(p.firstSaleDate)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
