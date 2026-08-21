import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR, formatDate } from '../../lib/format'
import { exportOrdersToExcel } from '../../lib/excelExport'
import { paymentInfoForOrder } from '../../lib/orderStatus'
import OrderDateEditor from '../../components/OrderDateEditor'
import { Card, Spinner, Pill } from '../../components/ui'

const TABS = [
  { key: 'order_received', label: 'Order Received' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_received', label: 'Payment Received' },
  { key: 'all', label: 'All' },
]

export default function AdminOrders() {
  const { role } = useAuth()
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [shops, setShops] = useState({})
  const [reps, setReps] = useState({})
  const [invoices, setInvoices] = useState({})
  const [loading, setLoading] = useState(true)
  const [repFilter, setRepFilter] = useState('')
  const [tab, setTab] = useState('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [ordersRes, paymentsRes, shopsRes, repsRes, invoicesRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('order_date', { ascending: false }).limit(300),
      supabase.from('payments').select('*'),
      supabase.from('shopkeepers').select('id, shop_name'),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('invoices').select('*'),
    ])
    setOrders(ordersRes.data || [])
    setPayments(paymentsRes.data || [])
    setShops(Object.fromEntries((shopsRes.data || []).map((s) => [s.id, s.shop_name])))
    setReps(Object.fromEntries((repsRes.data || []).map((r) => [r.id, r.full_name])))
    setInvoices(Object.fromEntries((invoicesRes.data || []).map((inv) => [inv.order_id, inv])))
    setLoading(false)
  }

  async function deleteSale(orderId) {
    setDeleting(true)
    const { error } = await supabase.rpc('delete_sale', { order_id_input: orderId })
    setDeleting(false)
    setConfirmDeleteId(null)
    if (error) {
      alert(`Could not delete: ${error.message}`)
    } else {
      load()
    }
  }

  if (loading) return <Spinner />

  const withStatus = orders.map((o) => ({ ...o, pay: paymentInfoForOrder(o, payments) }))
  const byRep = repFilter ? withStatus.filter((o) => o.rep_id === repFilter) : withStatus

  const filtered = byRep.filter((o) => {
    if (tab === 'all') return true
    if (tab === 'order_received') return o.delivery_status === 'order_received'
    if (tab === 'delivered') return o.delivery_status === 'delivered'
    if (tab === 'payment_pending') return o.pay.status !== 'paid'
    if (tab === 'payment_received') return o.pay.status === 'paid'
    return true
  })
  const total = filtered.reduce((s, o) => s + Number(o.total_amount), 0)

  const counts = {
    order_received: byRep.filter((o) => o.delivery_status === 'order_received').length,
    delivered: byRep.filter((o) => o.delivery_status === 'delivered').length,
    payment_pending: byRep.filter((o) => o.pay.status !== 'paid').length,
    payment_received: byRep.filter((o) => o.pay.status === 'paid').length,
    all: byRep.length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">All sales ({filtered.length})</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrdersToExcel(filtered, { shopsMap: shops, repsMap: reps })}
            className="text-xs font-semibold text-white bg-[var(--color-brand)] px-3 py-2 rounded-lg"
          >
            Export Excel
          </button>
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm bg-white"
          >
            <option value="">All reps</option>
            {Object.entries(reps).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
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

      <Card className="p-4 mb-4">
        <p className="text-xs text-[var(--color-ink-soft)]">Total (shown)</p>
        <p className="text-xl font-bold text-[var(--color-brand)] mt-1">{formatINR(total)}</p>
      </Card>

      <div className="space-y-2">
        {filtered.map((o) => (
          <Card key={o.id} className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{shops[o.shopkeeper_id] || 'Shop'}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {reps[o.rep_id] || 'Rep'} · {formatDate(o.order_date)}
                </p>
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

            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--color-line)] flex-wrap">
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
              {role === 'admin' && (
                confirmDeleteId === o.id ? (
                  <>
                    <span className="text-xs text-[var(--color-owe)]">Delete this sale?</span>
                    <button
                      onClick={() => deleteSale(o.id)}
                      disabled={deleting}
                      className="text-xs font-semibold text-white bg-[var(--color-owe)] px-2.5 py-1 rounded-lg"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[var(--color-ink-soft)]">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDeleteId(o.id)} className="text-xs font-medium text-[var(--color-owe)] ml-auto">
                    Delete
                  </button>
                )
              )}
            </div>
            <OrderDateEditor order={o} onUpdated={load} />
          </Card>
        ))}
      </div>
    </div>
  )
}
