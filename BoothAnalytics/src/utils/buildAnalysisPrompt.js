function toYM(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

export function buildAnalysisPrompt(rows, firstSaleDates) {
  if (!rows.length) return ''

  // ── 全体集計 ──
  const total      = rows.reduce((s, r) => s + r.amount, 0)
  const orderIds   = new Set(rows.map(r => r.orderId).filter(Boolean))
  const orderCount = orderIds.size > 0 ? orderIds.size : rows.length
  const userIds    = new Set(rows.map(r => r.userId).filter(Boolean))
  const dates      = rows.map(r => r.date)
  const minDate    = new Date(Math.min(...dates))
  const maxDate    = new Date(Math.max(...dates))

  // ── 月別集計 ──
  const monthMap = new Map()
  for (const r of rows) {
    const ym = toYM(r.date)
    const e  = monthMap.get(ym) ?? { revenue: 0, orders: new Set() }
    e.revenue += r.amount
    if (r.orderId) e.orders.add(r.orderId)
    monthMap.set(ym, e)
  }
  const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // ── 商品別集計 ──
  const productMap = new Map()
  for (const r of rows) {
    const e = productMap.get(r.product) ?? { revenue: 0, quantity: 0 }
    e.revenue  += r.amount
    e.quantity += r.quantity
    productMap.set(r.product, e)
  }
  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)

  // ── 曜日別集計 ──
  const DAYS   = ['日', '月', '火', '水', '木', '金', '土']
  const dowArr = Array.from({ length: 7 }, () => ({ orders: 0, revenue: 0 }))
  for (const r of rows) {
    const dow = r.date.getDay()
    dowArr[dow].orders  += 1
    dowArr[dow].revenue += r.amount
  }
  const bestDow = dowArr
    .map((d, i) => ({ day: DAYS[i], ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3)

  // ── リピーター ──
  let repeatRate = null
  if (userIds.size > 0) {
    const userOrderMap = new Map()
    for (const r of rows) {
      if (!r.userId) continue
      const s = userOrderMap.get(r.userId) ?? new Set()
      if (r.orderId) s.add(r.orderId)
      userOrderMap.set(r.userId, s)
    }
    const repeaters = Array.from(userOrderMap.values()).filter(s => s.size > 1)
    repeatRate = (repeaters.length / userOrderMap.size * 100).toFixed(1)
  }

  // ── プロンプト組み立て ──
  const d = date => `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}`

  const lines = [
    'あなたはBooth（日本のクリエイター向けECサービス）の売上データアナリストです。',
    '以下のデータを分析し、日本語で回答してください。\n',

    '## 分析期間',
    `${d(minDate)} 〜 ${d(maxDate)}\n`,

    '## 全体実績',
    `- 総売上: ${fmt(total)}`,
    `- 総注文数: ${orderCount.toLocaleString()}件`,
    `- 平均注文単価: ${fmt(Math.round(total / Math.max(orderCount, 1)))}`,
    `- 取扱商品数: ${productMap.size}種`,
    userIds.size > 0 ? `- ユニーク顧客数: ${userIds.size}人` : null,
    repeatRate   !== null ? `- リピーター率: ${repeatRate}%` : null,
    '',

    '## 月別売上推移',
    ...months.map(([ym, data], i) => {
      const prev   = i > 0 ? months[i - 1][1].revenue : null
      const growth = prev ? ((data.revenue - prev) / prev * 100).toFixed(1) : null
      const g      = growth ? `（前月比: ${+growth > 0 ? '+' : ''}${growth}%）` : ''
      return `- ${ym}: ${fmt(data.revenue)} ${g}`
    }),
    '',

    '## 売上トップ5商品',
    ...topProducts.map(([name, data], i) => {
      const fs  = firstSaleDates?.get(name)
      const fsStr = fs ? ` ※初回売上: ${toYM(fs)}` : ''
      return `${i + 1}. ${name}  ${fmt(data.revenue)} / ${Math.round(data.quantity)}件${fsStr}`
    }),
    '',

    '## 曜日別売上（上位3）',
    ...bestDow.map(d => `- ${d.day}曜日: ${fmt(d.revenue)} / ${d.orders}件`),
    '',

    '---',
    '上記データをもとに、以下3点を分析してください：',
    '1. **売上トレンドと特徴的な傾向**（具体的な数値を引用して）',
    '2. **注目すべき商品・顧客行動の特徴**',
    '3. **次の1ヶ月で実行できる具体的なアクション提案**（3つ）',
  ].filter(l => l !== null)

  return lines.join('\n')
}
