import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatINR } from '../../lib/format'
import { exportDailyReportToExcel } from '../../lib/excelExport'
import { Card, Spinner, SectionTitle } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [from, setFrom] = useState(isoDaysAgo(29))
  const [to, setTo] = useState(isoDaysAgo(0))

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [ordersRes, paymentsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, order_date, rep_id, shopkeeper_id, delivery_status, delivered_at'),
      supabase.from('payments').select('amount, payment_date, mode, rep_id, shopkeeper_id'),
    ])
    setOrders(ordersRes.data || [])
    setPayments(paymentsRes.data || [])
    setLoading(false)
  }

  const { filteredOrders, filteredPayments, dailyRows, totals, todayStats } = useMemo(() => {
    const fromDate = new Date(from + 'T00:00:00')
    const toDate = new Date(to + 'T23:59:59')

    const fOrders = orders.filter((o) => {
      const d = new Date(o.order_date)
      return d >= fromDate && d <= toDate
    })
    const fPayments = payments.filter((p) => {
      const d = new Date(p.payment_date)
      return d >= fromDate && d <= toDate
    })

    const byDay = {}
    const dayKey = (d) => new Date(d).toLocaleDateString('en-CA')
    for (const o of fOrders) {
      const k = dayKey(o.order_date)
      byDay[k] = byDay[k] || { date: k, sales: 0, collections: 0, ordersReceived: 0, ordersDelivered: 0 }
      byDay[k].sales += Number(o.total_amount)
      byDay[k].ordersReceived += 1
      if (o.delivery_status === 'delivered') byDay[k].ordersDelivered += 1
    }
    for (const p of fPayments) {
      const k = dayKey(p.payment_date)
      byDay[k] = byDay[k] || { date: k, sales: 0, collections: 0, ordersReceived: 0, ordersDelivered: 0 }
      byDay[k].collections += Number(p.amount)
    }
    const rows = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))

    const totalSales = fOrders.reduce((s, o) => s + Number(o.total_amount), 0)
    const totalCollections = fPayments.reduce((s, p) => s + Number(p.amount), 0)
    const cash = fPayments.filter((p) => p.mode === 'cash').reduce((s, p) => s + Number(p.amount), 0)
    const upi = fPayments.filter((p) => p.mode === 'upi').reduce((s, p) => s + Number(p.amount), 0)

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const todayOrders = orders.filter((o) => new Date(o.order_date) >= startOfToday)
    const todayPayments = payments.filter((p) => new Date(p.payment_date) >= startOfToday)
    const today = {
      ordersReceived: todayOrders.length,
      ordersDelivered: orders.filter((o) => o.delivered_at && new Date(o.delivered_at) >= startOfToday).length,
      sales: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      collections: todayPayments.reduce((s, p) => s + Number(p.amount), 0),
    }
    today.paymentPending = today.sales - todayPayments.reduce((s, p) => s + Number(p.amount), 0)

    return {
      filteredOrders: fOrders,
      filteredPayments: fPayments,
      dailyRows: rows,
      totals: { sales: totalSales, collections: totalCollections, credit: totalSales - totalCollections, cash, upi },
      todayStats: today,
    }
  }, [orders, payments, from, to])

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Reports</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">Daily orders, sales & collections</p>

      <SectionTitle>Today</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Orders received</p><p className="text-lg font-bold text-[var(--color-brand)] mt-1">{todayStats.ordersReceived}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Orders delivered</p><p className="text-lg font-bold text-[var(--color-paid)] mt-1">{todayStats.ordersDelivered}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Sales today</p><p className="text-lg font-bold text-[var(--color-brand)] mt-1">{formatINR(todayStats.sales)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Payment pending</p><p className="text-lg font-bold text-[var(--color-owe)] mt-1">{formatINR(todayStats.paymentPending)}</p></Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mt-6 mb-4">
        <SectionTitle>Custom range</SectionTitle>
        <div className="flex items-end gap-2">
          <label className="text-xs">
            <span className="block text-[var(--color-ink-soft)] mb-1">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-[var(--color-line)] px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="block text-[var(--color-ink-soft)] mb-1">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-[var(--color-line)] px-2 py-1.5 text-sm" />
          </label>
          <button
            onClick={() => exportDailyReportToExcel({ orders: filteredOrders, payments: filteredPayments, from, to })}
            className="text-sm font-semibold text-white bg-[var(--color-brand)] px-3 py-2 rounded-lg h-[34px]"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { label: '7 days', n: 6 },
          { label: '30 days', n: 29 },
          { label: '90 days', n: 89 },
        ].map((r) => (
          <button
            key={r.n}
            onClick={() => { setFrom(isoDaysAgo(r.n)); setTo(isoDaysAgo(0)) }}
            className="text-xs font-medium bg-[var(--color-brand-soft)] text-[var(--color-brand)] px-3 py-1.5 rounded-full"
          >
            Last {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Total sales</p><p className="text-lg font-bold text-[var(--color-brand)] mt-1">{formatINR(totals.sales)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Total collected</p><p className="text-lg font-bold text-[var(--color-paid)] mt-1">{formatINR(totals.collections)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Payment pending</p><p className="text-lg font-bold text-[var(--color-owe)] mt-1">{formatINR(totals.credit)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">Cash</p><p className="text-lg font-bold mt-1">{formatINR(totals.cash)}</p></Card>
        <Card className="p-4"><p className="text-xs text-[var(--color-ink-soft)]">UPI</p><p className="text-lg font-bold mt-1">{formatINR(totals.upi)}</p></Card>
      </div>

      <SectionTitle>Day by day</SectionTitle>
      {dailyRows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-ink-soft)]">No activity in this range.</Card>
      ) : (
        <Card className="p-4">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={dailyRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend />
                <Bar dataKey="sales" fill="var(--color-brand)" name="Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" fill="var(--color-gold)" name="Collections" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="mt-3 space-y-1.5">
        {dailyRows.slice().reverse().map((d) => (
          <Card key={d.date} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.date}</span>
              <span className="text-[var(--color-brand)]">Sales {formatINR(d.sales)}</span>
              <span className="text-[var(--color-paid)]">Collected {formatINR(d.collections)}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-ink-soft)]">
              <span>{d.ordersReceived} orders received</span>
              <span>{d.ordersDelivered} delivered</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
