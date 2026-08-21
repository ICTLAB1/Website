import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR, formatDate } from '../../lib/format'
import { paymentInfoForOrder } from '../../lib/orderStatus'
import OrderDateEditor from '../../components/OrderDateEditor'
import { Card, EmptyState, Spinner, Pill } from '../../components/ui'

const TABS = [
  { key: 'order_received', label: 'Order Received' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_received', label: 'Payment Received' },
  { key: 'all', label: 'All' },
]

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('order_received')

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const [ordersRes, paymentsRes, invoicesRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*), shopkeepers(shop_name, phone)').eq('rep_id', user.id).order('order_date', { ascending: false }),
      supabase.from('payments').select('*').eq('rep_id', user.id),
      supabase.from('invoices').select('*').eq('rep_id', user.id),
    ])
    setOrders(ordersRes.data || [])
    setPayments(paymentsRes.data || [])
    setInvoices(Object.fromEntries((invoicesRes.data || []).map((inv) => [inv.order_id, inv])))
    setLoading(false)
  }

  if (loading) return <Spinner />

  const withStatus = orders.map((o) => ({ ...o, pay: paymentInfoForOrder(o, payments) }))

  const filtered = withStatus.filter((o) => {
    if (tab === 'all') return true
    if (tab === 'order_received') return o.delivery_status === 'order_received'
    if (tab === 'delivered') return o.delivery_status === 'delivered'
    if (tab === 'payment_pending') return o.pay.status !== 'paid'
    if (tab === 'payment_received') return o.pay.status === 'paid'
    return true
  })

  const counts = {
    order_received: withStatus.filter((o) => o.delivery_status === 'order_received').length,
    delivered: withStatus.filter((o) => o.delivery_status === 'delivered').length,
    payment_pending: withStatus.filter((o) => o.pay.status !== 'paid').length,
    payment_received: withStatus.filter((o) => o.pay.status === 'paid').length,
    all: withStatus.length,
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Orders</h1>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              tab === t.key ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No orders here" subtitle="Nothing matches this filter yet." />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <Card key={o.id} className="p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{o.shopkeepers?.shop_name || 'Shop'}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(o.order_date)}</p>
                </div>
                <p className="font-semibold">{formatINR(o.total_amount)}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <Pill tone={o.delivery_status === 'delivered' ? 'paid' : 'gold'}>
                  {o.delivery_status === 'delivered' ? 'Delivered' : 'Order Received'}
                </Pill>
                <Pill tone={o.pay.status === 'paid' ? 'paid' : o.pay.status === 'partial' ? 'gold' : 'owe'}>
                  {o.pay.status === 'paid' ? 'Payment Received' : o.pay.status === 'partial' ? 'Partially Paid' : 'Payment Pending'}
                </Pill>
              </div>

              {o.order_items?.length > 0 && (
                <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 pt-1.5 border-t border-[var(--color-line)]">
                  {o.order_items.map((it) => `${it.product_name} ×${it.qty}`).join(', ')}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--color-line)]">
                {o.delivery_status === 'order_received' && (
                  <Link to={`/rep/deliver/${o.id}`} className="text-xs font-semibold text-white bg-[var(--color-brand)] px-2.5 py-1.5 rounded-lg">
                    Mark Delivered
                  </Link>
                )}
                {o.delivery_status === 'delivered' && o.pay.status !== 'paid' && (
                  <Link
                    to={`/rep/record-payment?shop=${o.shopkeeper_id}&order=${o.id}`}
                    className="text-xs font-semibold text-white bg-[var(--color-brand)] px-2.5 py-1.5 rounded-lg"
                  >
                    Collect {formatINR(o.pay.balance)}
                  </Link>
                )}
                {invoices[o.id] && (
                  <a href={invoices[o.id].pdf_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--color-brand)]">
                    📄 Invoice
                  </a>
                )}
                <Link to={`/rep/shopkeepers/${o.shopkeeper_id}`} className="text-xs text-[var(--color-ink-soft)] ml-auto">
                  View shop →
                </Link>
              </div>
              <OrderDateEditor order={o} onUpdated={load} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
