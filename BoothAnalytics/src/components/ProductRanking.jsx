import { useMemo, useState } from 'react'
import Thumbnail from './Thumbnail'
import './ProductRanking.css'

const SHOW_DEFAULT = 10

function fmtDate(date) {
  if (!date) return null
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

export default function ProductRanking({ rows, firstSaleDates }) {
  const [sortBy, setSortBy] = useState('revenue')
  const [showAll, setShowAll] = useState(false)

  const products = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const p = r.product
      const entry = map.get(p) || { name: p, revenue: 0, quantity: 0, orders: 0, itemId: null, imageUrl: null }
      entry.revenue += r.amount
      entry.quantity += r.quantity
      entry.orders += 1
      if (!entry.itemId && r.itemId) entry.itemId = r.itemId
      if (!entry.imageUrl && r.imageUrl) entry.imageUrl = r.imageUrl
      map.set(p, entry)
    }
    return Array.from(map.values()).sort((a, b) => b[sortBy] - a[sortBy])
  }, [rows, sortBy])

  if (rows.length === 0) return null

  const hasThumbnails = products.some(p => p.itemId || p.imageUrl)
  const maxRevenue = products[0]?.revenue || 1
  const displayed = showAll ? products : products.slice(0, SHOW_DEFAULT)

  return (
    <div className="card ranking-card">
      <div className="card-header">
        <span className="card-title">商品別ランキング</span>
        <div className="sort-toggle">
          <button
            className={sortBy === 'revenue' ? 'active' : ''}
            onClick={() => setSortBy('revenue')}
          >売上順</button>
          <button
            className={sortBy === 'quantity' ? 'active' : ''}
            onClick={() => setSortBy('quantity')}
          >数量順</button>
        </div>
      </div>

      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="th-rank">#</th>
              {hasThumbnails && <th className="th-thumb" />}
              <th>商品名</th>
              <th className="th-right">売上</th>
              <th className="th-right">数量</th>
              <th className="th-bar" />
            </tr>
          </thead>
          <tbody>
            {displayed.map((p, i) => (
              <tr key={p.name}>
                <td className="td-rank">
                  <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>
                    {i + 1}
                  </span>
                </td>
                {hasThumbnails && (
                  <td className="td-thumb">
                    <Thumbnail imageUrl={p.imageUrl} itemId={p.itemId} alt={p.name} size={40} />
                  </td>
                )}
                <td className="td-name" title={p.name}>
                  {p.name}
                  {firstSaleDates?.get(p.name) && (
                    <span className="first-sale-date">
                      📅 {fmtDate(firstSaleDates.get(p.name))}
                    </span>
                  )}
                </td>
                <td className="td-right td-revenue">
                  ¥{Math.round(p.revenue).toLocaleString('ja-JP')}
                </td>
                <td className="td-right td-qty">
                  {Math.round(p.quantity).toLocaleString()}
                </td>
                <td className="td-bar">
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length > SHOW_DEFAULT && (
        <button className="show-more-btn" onClick={() => setShowAll(v => !v)}>
          {showAll
            ? '▲ 上位10件のみ表示'
            : `▼ 全${products.length}商品を表示`}
        </button>
      )}
    </div>
  )
}
