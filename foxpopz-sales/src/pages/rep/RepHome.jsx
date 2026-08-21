import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR } from '../../lib/format'
import { Card, SectionTitle, Spinner, Pill } from '../../components/ui'

export default function RepHome() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaySales: 0,
    todayCollections: 0,
    ordersReceivedToday: 0,
    ordersDeliveredToday: 0,
    outstanding: 0,
    shopCount: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [ordersRes, paymentsRes, shopsRes] = await Promise.all([
      supabase.from('orders').select('id, total_amount, order_date, delivery_status, delivered_at, shopkeeper_id, shopkeepers(shop_name)').eq('rep_id', user.id).order('order_date', { ascending: false }),
      supabase.from('payments').select('amount, payment_date').eq('rep_id', user.id),
      supabase.from('shopkeepers').select('id', { count: 'exact', head: true }).eq('assigned_rep_id', user.id),
    ])

    const orders = ordersRes.data || []
    const payments = paymentsRes.data || []

    const totalOrders = orders.reduce((s, o) => s + Number(o.total_amount), 0)
    const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0)

    const todaySales = orders
      .filter((o) => new Date(o.order_date) >= startOfDay)
      .reduce((s, o) => s + Number(o.total_amount), 0)

    const todayCollections = payments
      .filter((p) => new Date(p.payment_date) >= startOfDay)
      .reduce((s, p) => s + Number(p.amount), 0)

    const ordersReceivedToday = orders.filter((o) => new Date(o.order_date) >= startOfDay).length
    const ordersDeliveredToday = orders.filter((o) => o.delivered_at && new Date(o.delivered_at) >= startOfDay).length

    setStats({
      todaySales,
      todayCollections,
      ordersReceivedToday,
      ordersDeliveredToday,
      outstanding: totalOrders - totalPayments,
      shopCount: shopsRes.count || 0,
    })
    setRecentOrders(orders.slice(0, 5))
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <p className="text-[var(--color-ink-soft)] text-sm">Namaste, {profile?.full_name?.split(' ')[0] || 'there'} 👋</p>
      <h1 className="text-xl font-semibold mb-4">Today's snapshot</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Orders received</p>
          <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{stats.ordersReceivedToday}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Orders delivered</p>
          <p className="text-xl font-bold text-[var(--color-paid)] mt-1">{stats.ordersDeliveredToday}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Today's sales</p>
          <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{formatINR(stats.todaySales)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-ink-soft)]">Collected today</p>
          <p className="text-xl font-bold text-[var(--color-paid)] mt-1">{formatINR(stats.todayCollections)}</p>
        </Card>
      </div>

      <Card className="mt-3 p-4 khata-lines">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-ink-soft)]">Total outstanding (your shops)</p>
            <p className="text-2xl font-bold text-[var(--color-owe)] mt-1">{formatINR(stats.outstanding)}</p>
          </div>
          <Link to="/rep/ledger" className="text-xs font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-3 py-1.5 rounded-full">
            View khata
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/rep/new-order" className="text-center bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-semibold rounded-xl py-3 active:scale-[0.98] transition">
          + Take Order
        </Link>
        <Link to="/rep/orders" className="text-center bg-[var(--color-brand)] text-white font-semibold rounded-xl py-3 active:scale-[0.98] transition">
          View Orders
        </Link>
      </div>

      <SectionTitle action={<Link to="/rep/shopkeepers" className="text-xs font-semibold text-[var(--color-brand)]">{stats.shopCount} shops →</Link>}>
        Recent orders
      </SectionTitle>
      {recentOrders.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-ink-soft)]">No orders yet. Tap "+ Take Order" to get started.</Card>
      ) : (
        <div className="space-y-2">
          {recentOrders.map((o) => (
            <Link key={o.id} to="/rep/orders">
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{o.shopkeepers?.shop_name || 'Shop'}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={o.delivery_status === 'delivered' ? 'paid' : 'gold'}>
                    {o.delivery_status === 'delivered' ? 'Delivered' : 'Order Received'}
                  </Pill>
                  <p className="font-semibold">{formatINR(o.total_amount)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
