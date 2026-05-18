import Papa from 'papaparse'

const COLUMN_PATTERNS = {
  date:      ['注文日時', '購入日時', '日時', '購入日', '注文日'],
  product:   ['商品名', '商品名称', '品名'],
  variant:   ['バリエーション名', 'バリエーション', 'variation'],
  quantity:  ['数量', '個数'],
  unitPrice: ['単価'],
  subtotal:  ['小計', '売上金額'],
  total:     ['決済金額', '支払い合計', '合計金額', '金額'],
  orderId:   ['注文番号', '注文ID'],
  itemId:    ['商品ID', '商品番号', 'item_id', 'ItemID'],
  imageUrl:  ['商品画像URL', '画像URL', '商品画像', 'image_url', 'サムネイル'],
  userId:    ['ユーザー識別コード', 'ユーザーID', 'user_id'],
}

function detectColumn(headers, patterns) {
  for (const pattern of patterns) {
    const found = headers.find(h => h.trim().includes(pattern))
    if (found) return found
  }
  return null
}

function parseAmount(str) {
  if (!str) return 0
  return parseFloat(str.toString().replace(/[,¥\s円]/g, '')) || 0
}

function parseDate(str) {
  if (!str) return null
  const normalized = str.trim()
    .replace(/\//g, '-')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日.*/g, '')
    // "2026-04-01 00:13:43" → "2026-04-01T00:13:43" (クロスブラウザ対応)
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2')
    .trim()
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

export function parseBoothCSV(csvText) {
  // BOM 除去
  const text = csvText.replace(/^﻿/, '')

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('CSVの解析に失敗しました: ' + result.errors[0].message)
  }

  const headers = result.meta.fields || []
  const cols = {}
  for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
    cols[key] = detectColumn(headers, patterns)
  }

  if (!cols.date) {
    throw new Error(
      '日付列が見つかりませんでした。\n' +
      'Booth の注文CSV（注文一覧.csv）をアップロードしてください。\n' +
      `検出された列: ${headers.join(', ')}`
    )
  }

  const rows = result.data
    .map(row => {
      const date = parseDate(row[cols.date])

      let amount = 0
      if (cols.subtotal && row[cols.subtotal]) {
        amount = parseAmount(row[cols.subtotal])
      } else if (cols.unitPrice && cols.quantity) {
        const unitPrice = parseAmount(row[cols.unitPrice])
        const qty = parseFloat(row[cols.quantity]) || 1
        amount = unitPrice * qty
      } else if (cols.total && row[cols.total]) {
        amount = parseAmount(row[cols.total])
      }

      return {
        date,
        product:  cols.product  ? (row[cols.product]  || '不明') : '不明',
        variant:  cols.variant  ? (row[cols.variant]  || null)   : null,
        quantity: cols.quantity ? (parseFloat(row[cols.quantity]) || 1) : 1,
        amount,
        orderId:  cols.orderId  ? row[cols.orderId]  : null,
        itemId:   cols.itemId   ? (row[cols.itemId]   || null) : null,
        imageUrl: cols.imageUrl ? (row[cols.imageUrl] || null) : null,
        userId:   cols.userId   ? (row[cols.userId]   || null) : null,
      }
    })
    .filter(r => r.date !== null && r.amount > 0)

  if (rows.length === 0) {
    throw new Error(
      'データが見つかりませんでした。\n' +
      'CSVの形式を確認してください（金額・日付が必要です）。'
    )
  }

  return { rows, detectedColumns: cols, headers, rawCount: result.data.length }
}

export function mergeBoothCSVs(results) {
  const allRows = results.flatMap(r => r.rows)

  // orderId がある場合は重複排除
  const hasOrderId = allRows.some(r => r.orderId)
  let merged
  if (hasOrderId) {
    const seen = new Set()
    merged = allRows.filter(r => {
      const key = r.orderId ? `${r.orderId}::${r.product}` : null
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } else {
    merged = allRows
  }

  merged.sort((a, b) => a.date - b.date)
  return {
    rows: merged,
    detectedColumns: results[0]?.detectedColumns ?? {},
    headers: results[0]?.headers ?? [],
    rawCount: results.reduce((s, r) => s + r.rawCount, 0),
  }
}
