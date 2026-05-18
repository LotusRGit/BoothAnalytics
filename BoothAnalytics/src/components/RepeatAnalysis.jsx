import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import './RepeatAnalysis.css'

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function maskUser(id) {
  if (!id) return '????'
  return id.slice(0, 4) + '·'.repeat(4)
}

export default function RepeatAnalysis({ rows }) {
  const hasUserId = rows.some(r => r.userId)

  const userStats = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const uid = r.userId ?? '__unknown__'
      const e = map.get(uid) ?? { userId: r.userId, orderIds: new Set(), revenue: 0 }
      e.orderIds.add(r.orderId ?? Symbol())
      e.revenue += r.amount
      map.set(uid, e)
    }
    return Array.from(map.values())
      .map(u => ({ ...u, orderCount: u.orderIds.size }))
      .sort((a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue)
  }, [rows])

  const summary = useMemo(() => {
    const total = userStats.length
    const repeaters = userStats.filter(u => u.orderCount > 1)
    const totalRevenue  = userStats.reduce((s, u) => s + u.revenue, 0)
    const repeatRevenue = repeaters.reduce((s, u) => s + u.revenue, 0)
    return {
      total,
      repeaterCount: repeaters.length,
      repeatRate:        total        > 0 ? repeaters.length / total        * 100 : 0,
      repeatRevenueRate: totalRevenue > 0 ? repeatRevenue   / totalRevenue * 100 : 0,
    }
  }, [userStats])

  const distribution = useMemo(() => {
    const bins = { 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 }
    for (const u of userStats) {
      if      (u.orderCount === 1) bins[1]++
      else if (u.orderCount === 2) bins[2]++
      else if (u.orderCount === 3) bins[3]++
      else if (u.orderCount === 4) bins[4]++
      else                         bins['5+']++
    }
    return [
      { label: '1回',   count: bins[1],    repeat: false },
      { label: '2回',   count: bins[2],    repeat: true  },
      { label: '3回',   count: bins[3],    repeat: true  },
      { label: '4回',   count: bins[4],    repeat: true  },
      { label: '5回以上', count: bins['5+'], repeat: true  },
    ]
  }, [userStats])

  const topRepeaters = userStats.filter(u => u.orderCount > 1).slice(0, 10)

  if (!hasUserId) {
    return (
      <div className="card">
        <p className="no-data-msg">
          CSVに「ユーザー識別コード」列が含まれていないため、リピーター分析ができません。
        </p>
      </div>
    )
  }

  return (
    <div className="repeat-analysis">

      {/* KPI */}
      <div className="repeat-kpi-grid">
        {[
          { label: '総ユニーク顧客', value: `${summary.total.toLocaleString()} 人`,        color: '#4f46e5' },
          { label: 'リピーター数',   value: `${summary.repeaterCount.toLocaleString()} 人`, color: '#10b981' },
          { label: 'リピーター率',   value: `${summary.repeatRate.toFixed(1)} %`,           color: '#f59e0b' },
          { label: 'リピーター売上比', value: `${summary.repeatRevenueRate.toFixed(1)} %`,  color: '#0ea5e9' },
        ].map(c => (
          <div key={c.label} className="repeat-kpi-card" style={{ '--accent': c.color }}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 購入回数の分布 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">購入回数の分布</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distribution} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 13, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={v => [`${v} 人`, '顧客数']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {distribution.map((d, i) => (
                <Cell key={i} fill={d.repeat ? '#4f46e5' : '#cbd5e1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="dist-legend">
          <span className="dist-dot new" />新規顧客（1回のみ）
          <span className="dist-dot repeat" />リピーター（2回以上）
        </div>
      </div>

      {/* リピーター上位テーブル */}
      {topRepeaters.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">リピーター上位</span>
            <span className="repeat-badge">{topRepeaters.length} 人</span>
          </div>
          <div className="repeat-table-wrap">
            <table className="repeat-table">
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th>ユーザー</th>
                  <th className="col-right">購入回数</th>
                  <th className="col-right">累計売上</th>
                  <th className="col-bar" />
                </tr>
              </thead>
              <tbody>
                {topRepeaters.map((u, i) => {
                  const maxRev = topRepeaters[0].revenue
                  return (
                    <tr key={u.userId ?? i}>
                      <td className="col-rank">
                        <span className={`repeat-rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                      </td>
                      <td className="col-user">{maskUser(u.userId)}</td>
                      <td className="col-orders">{u.orderCount} 回</td>
                      <td className="col-revenue">{fmt(u.revenue)}</td>
                      <td className="col-bar">
                        <div className="repeat-bar-track">
                          <div className="repeat-bar-fill" style={{ width: `${u.revenue / maxRev * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
