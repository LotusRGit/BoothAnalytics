import { useMemo } from 'react'
import Thumbnail from './Thumbnail'
import './MonthlyReport.css'

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function toYM(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthlyData(rows) {
  const map = new Map()

  for (const r of rows) {
    const key = toYM(r.date)
    if (!map.has(key)) map.set(key, { month: key, revenue: 0, orders: new Set(), products: new Map() })
    const m = map.get(key)
    m.revenue += r.amount
    if (r.orderId) m.orders.add(r.orderId)
    else m.orders.add(Symbol()) // unique per row when no orderId

    const existing = m.products.get(r.product) || { revenue: 0, itemId: null, imageUrl: null }
    existing.revenue += r.amount
    if (!existing.itemId && r.itemId) existing.itemId = r.itemId
    if (!existing.imageUrl && r.imageUrl) existing.imageUrl = r.imageUrl
    m.products.set(r.product, existing)
  }

  const sorted = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))

  return sorted.map((m, i) => {
    const orderCount = m.orders.size
    const topEntry = Array.from(m.products.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0]
    const prev = sorted[i - 1]
    const growth = prev ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : null

    return {
      month: m.month,
      revenue: m.revenue,
      orderCount,
      avgOrder: orderCount > 0 ? m.revenue / orderCount : 0,
      topProduct: topEntry ? { name: topEntry[0], ...topEntry[1] } : null,
      growth,
    }
  }).reverse() // 新しい月を上に
}

export default function MonthlyReport({ rows }) {
  const monthly = useMemo(() => buildMonthlyData(rows), [rows])

  if (rows.length === 0) return null

  return (
    <div className="card monthly-card">
      <div className="card-header">
        <span className="card-title">月次レポート</span>
        <span className="monthly-count">{monthly.length} ヶ月</span>
      </div>

      <div className="monthly-table-wrap">
        <table className="monthly-table">
          <thead>
            <tr>
              <th>月</th>
              <th className="th-right">売上</th>
              <th className="th-right">前月比</th>
              <th className="th-right">注文数</th>
              <th className="th-right">平均単価</th>
              <th>トップ商品</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(m => (
              <tr key={m.month}>
                <td className="td-month">{m.month}</td>
                <td className="td-right td-revenue">{fmt(m.revenue)}</td>
                <td className="td-right">
                  {m.growth === null ? (
                    <span className="growth-na">—</span>
                  ) : (
                    <span className={`growth-badge ${m.growth >= 0 ? 'up' : 'down'}`}>
                      {m.growth >= 0 ? '▲' : '▼'} {Math.abs(m.growth).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="td-right">{m.orderCount.toLocaleString()} 件</td>
                <td className="td-right">{fmt(m.avgOrder)}</td>
                <td className="td-top-product">
                  {m.topProduct && (
                    <div className="top-product-cell">
                      <Thumbnail
                        imageUrl={m.topProduct.imageUrl}
                        itemId={m.topProduct.itemId}
                        alt={m.topProduct.name}
                        size={36}
                      />
                      <span className="top-product-name" title={m.topProduct.name}>
                        {m.topProduct.name}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
