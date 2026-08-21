import * as XLSX from 'xlsx'

function downloadWorkbook(sheets, filename) {
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename)
}

export function exportOrdersToExcel(orders, { shopsMap = {}, repsMap = {} } = {}) {
  const rows = orders.map((o) => ({
    'Invoice date': new Date(o.order_date).toLocaleDateString('en-IN'),
    Shop: shopsMap[o.shopkeeper_id] || o.shopkeeper_id,
    Rep: repsMap[o.rep_id] || o.rep_id,
    'Items': (o.order_items || []).map((it) => `${it.product_name} x${it.qty}`).join('; '),
    'Total (₹)': Number(o.total_amount),
    'Delivery status': o.delivery_status || 'order_received',
    Status: o.status,
    Notes: o.notes || '',
  }))
  downloadWorkbook([{ name: 'Sales', rows }], `foxpopz-sales-${dateStamp()}.xlsx`)
}

export function exportPaymentsToExcel(payments, { shopsMap = {}, repsMap = {} } = {}) {
  const rows = payments.map((p) => ({
    Date: new Date(p.payment_date).toLocaleDateString('en-IN'),
    Shop: shopsMap[p.shopkeeper_id] || p.shopkeeper_id,
    Rep: repsMap[p.rep_id] || p.rep_id,
    Mode: p.mode.toUpperCase(),
    'Amount (₹)': Number(p.amount),
    Notes: p.notes || '',
  }))
  downloadWorkbook([{ name: 'Collections', rows }], `foxpopz-collections-${dateStamp()}.xlsx`)
}

// One sheet per day: total sales, total collected, net for the day, plus
// order-lifecycle counts (received/delivered/payment pending).
export function exportDailyReportToExcel({ orders, payments, from, to }) {
  const byDay = {}
  const dayKey = (d) => new Date(d).toLocaleDateString('en-CA') // YYYY-MM-DD, sorts correctly

  for (const o of orders) {
    const k = dayKey(o.order_date)
    byDay[k] = byDay[k] || { date: k, sales: 0, collections: 0, ordersReceived: 0, ordersDelivered: 0 }
    byDay[k].sales += Number(o.total_amount)
    byDay[k].ordersReceived += 1
    if (o.delivery_status === 'delivered') byDay[k].ordersDelivered += 1
  }
  for (const p of payments) {
    const k = dayKey(p.payment_date)
    byDay[k] = byDay[k] || { date: k, sales: 0, collections: 0, ordersReceived: 0, ordersDelivered: 0 }
    byDay[k].collections += Number(p.amount)
  }

  const rows = Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      Date: d.date,
      'Orders received': d.ordersReceived,
      'Orders delivered': d.ordersDelivered,
      'Sales (₹)': d.sales,
      'Collected (₹)': d.collections,
      'Payment pending (₹)': d.sales - d.collections,
    }))

  downloadWorkbook(
    [{ name: 'Daily report', rows }],
    `foxpopz-daily-report-${from || ''}-to-${to || dateStamp()}.xlsx`
  )
}

// One row per shopkeeper: total sold, total collected, outstanding.
export function exportOutstandingToExcel(shops, balances) {
  const rows = shops.map((s) => ({
    Shop: s.shop_name,
    Area: s.area || '',
    Phone: s.phone || '',
    'Total sold (₹)': balances[s.id]?.totalOrders || 0,
    'Total received (₹)': balances[s.id]?.totalPaid || 0,
    'Outstanding (₹)': balances[s.id]?.outstanding || 0,
  }))
  downloadWorkbook([{ name: 'Outstanding', rows }], `foxpopz-outstanding-${dateStamp()}.xlsx`)
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}
