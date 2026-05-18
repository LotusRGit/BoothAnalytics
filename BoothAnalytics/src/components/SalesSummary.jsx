import { useMemo } from 'react'
import './SalesSummary.css'

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

export default function SalesSummary({ rows }) {
  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amount, 0)
    const totalQty = rows.reduce((s, r) => s + r.quantity, 0)
    const orderIds = new Set(rows.map(r => r.orderId).filter(Boolean))
    const orderCount = orderIds.size > 0 ? orderIds.size : rows.length
    const products = new Set(rows.map(r => r.product))
    return {
      total,
      orderCount,
      avgOrder: orderCount > 0 ? total / orderCount : 0,
      totalQty: Math.round(totalQty),
      productCount: products.size,
    }
  }, [rows])

  const cards = [
    { label: '総売上', value: fmt(stats.total), icon: '💰', color: '#4f46e5' },
    { label: '注文数', value: stats.orderCount.toLocaleString() + ' 件', icon: '🛍️', color: '#0ea5e9' },
    { label: '平均注文単価', value: fmt(stats.avgOrder), icon: '📈', color: '#10b981' },
    { label: '商品種類数', value: stats.productCount.toLocaleString() + ' 種', icon: '📦', color: '#f59e0b' },
  ]

  if (rows.length === 0) {
    return (
      <div className="summary-empty">
        選択した期間にデータがありません。
      </div>
    )
  }

  return (
    <div className="summary-grid">
      {cards.map(c => (
        <div className="summary-card" key={c.label} style={{ '--accent': c.color }}>
          <div className="summary-icon">{c.icon}</div>
          <div className="summary-body">
            <div className="summary-label">{c.label}</div>
            <div className="summary-value">{c.value}</div>
          </div>
          <div className="summary-bar" />
        </div>
      ))}
    </div>
  )
}
