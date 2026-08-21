import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { formatINR } from '../../lib/format'
import { Card, SectionTitle, Spinner } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ sales: 0, collections: 0, outstanding: 0, lowStock: 0 })
  const [today, setToday] = useState({ ordersReceived: 0, ordersDelivered: 0, sales: 0, collections: 0 })
  const [byRep, setByRep] = useState([])
  const [topOwed, setTopOwed] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [ordersRes, paymentsRes, productsRes, shopsRes, repsRes] = await Promise.all([
      supabase.from('orders').select('total_amount, rep_id, shopkeeper_id, order_date, delivery_status, delivered_at'),
      supabase.from('payments').select('amount, rep_id, shopkeeper_id, payment_date'),
      supabase.from('products').select('id, name, stock_qty'),
      supabase.from('shopkeepers').select('id, shop_name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'rep'),
    ])

    const orders = ordersRes.data || []
    const payments = paymentsRes.data || []
    const products = productsRes.data || []
    const shops = shopsRes.data || []
    const reps = repsRes.data || []

    const totalSales = orders.reduce((s, o) => s + Number(o.total_amount), 0)
    const totalCollections = payments.reduce((s, p) => s + Number(p.amount), 0)
    const lowStock = products.filter((p) => Number(p.stock_qty) <= 20).length

    setTotals({
      sales: totalSales,
      collections: totalCollections,
      outstanding: totalSales - totalCollections,
      lowStock,
    })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayOrders = orders.filter((o) => new Date(o.order_date) >= startOfDay)
    const todayPayments = payments.filter((p) => new Date(p.payment_date) >= startOfDay)
    setToday({
      ordersReceived: todayOrders.length,
      ordersDelivered: orders.filter((o) => o.delivered_at && new Date(o.delivered_at) >= startOfDay).length,
      sales: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      collections: todayPayments.reduce((s, p) => s + Number(p.amount), 0),
    })

    // sales by rep
    const repMap = {}
    for (const o of orders) {
      repMap[o.rep_id] = repMap[o.rep_id] || { sales: 0, collections: 0 }
      repMap[o.rep_id].sales += Number(o.total_amount)
    }
    for (const p of payments) {
      repMap[p.rep_id] = repMap[p.rep_id] || { sales: 0, collections: 0 }
      repMap[p.rep_id].collections += Number(p.amount)
    }
    const repRows = reps.map((r) => ({
      name: r.full_name || 'Rep',
      sales: repMap[r.id]?.sales || 0,
      collections: repMap[r.id]?.collections || 0,
    }))
    setByRep(repRows)

    // top outstanding shops
    const shopMap = {}
    for (const o of orders) {
      shopMap[o.shopkeeper_id] = (shopMap[o.shopkeeper_id] || 0) + Number(o.total_amount)
    }
    const paidMap = {}
    for (const p of payments) {
      paidMap[p.shopkeeper_id] = (paidMap[p.shopkeeper_id] || 0) + Number(p.amount)
    }
    const owed = shops
      .map((s) => ({ name: s.shop_name, outstanding: (shopMap[s.id] || 0) - (paidMap[s.id] || 0) }))
      .filter((s) => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 8)
    setTopOwed(owed)
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Business overview</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/rep/new-order" className="text-center bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-semibold rounded-xl py-3 active:scale-[0.98] transition">
          + Add Sale
        </Link>
        <Link to="/rep/record-payment" className="text-center bg-[var(--color-brand)] text-white font-semibold rounded-xl py-3 active:scale-[0.98] transition">
          Collect Payment
        </Link>
      </div>

      <SectionTitle>Today</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Orders received</p>
          <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{today.ordersReceived}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Orders delivered</p>
          <p className="text-xl font-bold text-[var(--color-paid)] mt-1">{today.ordersDelivered}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Today's sales</p>
          <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{formatINR(today.sales)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Collected today</p>
          <p className="text-xl font-bold text-[var(--color-paid)] mt-1">{formatINR(today.collections)}</p>
        </Card>
      </div>

      <SectionTitle>All-time</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Total sales</p>
          <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{formatINR(totals.sales)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Total collected</p>
          <p className="text-xl font-bold text-[var(--color-paid)] mt-1">{formatINR(totals.collections)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Outstanding (all shops)</p>
          <p className="text-xl font-bold text-[var(--color-owe)] mt-1">{formatINR(totals.outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Low stock items</p>
          <p className="text-xl font-bold text-[var(--color-gold-dark)] mt-1">{totals.lowStock}</p>
        </Card>
      </div>

      <SectionTitle>Sales & collections by rep</SectionTitle>
      {byRep.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-ink-soft)]">No reps yet. Add reps from the Reps tab.</Card>
      ) : (
        <Card className="p-4">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={byRep}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatINR(v)} />
                <Bar dataKey="sales" fill="var(--color-brand)" name="Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" fill="var(--color-gold)" name="Collections" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <SectionTitle>Shops with highest dues</SectionTitle>
      {topOwed.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-ink-soft)]">No outstanding dues right now.</Card>
      ) : (
        <div className="space-y-2">
          {topOwed.map((s, i) => (
            <Card key={i} className="p-3.5 flex items-center justify-between">
              <p className="font-medium text-sm">{s.name}</p>
              <p className="font-semibold text-[var(--color-owe)]">{formatINR(s.outstanding)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
