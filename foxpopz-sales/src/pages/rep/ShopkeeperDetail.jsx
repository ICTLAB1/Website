import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR, formatDate } from '../../lib/format'
import { buildInvoiceWhatsAppMessage, openWhatsAppChat, normalizeIndianPhone } from '../../lib/whatsapp'
import { paymentInfoForOrder, DELIVERY_LABELS, PAYMENT_LABELS } from '../../lib/orderStatus'
import OrderDateEditor from '../../components/OrderDateEditor'
import { Card, SectionTitle, Spinner, Pill } from '../../components/ui'

export default function ShopkeeperDetail() {
  const { role } = useAuth()
  const { id } = useParams()
  const [shop, setShop] = useState(null)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState({})
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const [shopRes, ordersRes, paymentsRes, invoicesRes] = await Promise.all([
      supabase.from('shopkeepers').select('*').eq('id', id).single(),
      supabase.from('orders').select('*, order_items(*)').eq('shopkeeper_id', id).order('order_date', { ascending: false }),
      supabase.from('payments').select('*').eq('shopkeeper_id', id).order('payment_date', { ascending: false }),
      supabase.from('invoices').select('*').eq('shopkeeper_id', id),
    ])
    setShop(shopRes.data)
    setOrders(ordersRes.data || [])
    setPayments(paymentsRes.data || [])
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
  if (!shop) return <p className="text-center text-[var(--color-ink-soft)] py-10">Shop not found.</p>

  const totalOrders = orders.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const outstanding = totalOrders - totalPaid

  // merge timeline
  const timeline = [
    ...orders.map((o) => ({ type: 'order', date: o.order_date, data: o })),
    ...payments.map((p) => ({ type: 'payment', date: p.payment_date, data: p })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div>
      <h1 className="text-xl font-semibold">{shop.shop_name}</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">
        {[shop.owner_name, shop.phone, shop.area].filter(Boolean).join(' · ') || 'No contact details'}
      </p>

      <Card className="p-4 khata-lines">
        <p className="text-xs text-[var(--color-ink-soft)]">Outstanding balance</p>
        <p className={`text-2xl font-bold mt-1 ${outstanding > 0 ? 'text-[var(--color-owe)]' : 'text-[var(--color-paid)]'}`}>
          {outstanding > 0 ? formatINR(outstanding) : 'Fully paid ✓'}
        </p>
        <div className="flex gap-4 mt-2 text-xs text-[var(--color-ink-soft)]">
          <span>Total sold: {formatINR(totalOrders)}</span>
          <span>Total received: {formatINR(totalPaid)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link
          to={`/rep/new-order?shop=${shop.id}`}
          className="text-center bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-semibold rounded-xl py-3 active:scale-[0.98] transition"
        >
          + Take Order
        </Link>
        <Link
          to={`/rep/record-payment?shop=${shop.id}`}
          className="text-center bg-[var(--color-brand)] text-white font-semibold rounded-xl py-3 active:scale-[0.98] transition"
        >
          Collect Payment
        </Link>
      </div>

      <SectionTitle>History</SectionTitle>
      {timeline.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-ink-soft)]">No activity yet.</Card>
      ) : (
        <div className="space-y-2">
          {timeline.map((item, i) => {
            if (item.type !== 'order') {
              return (
                <Card key={`p-${i}`} className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Payment received</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(item.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone="gold">{item.data.mode.toUpperCase()}</Pill>
                    <p className="font-semibold text-[var(--color-paid)]">{formatINR(item.data.amount)}</p>
                  </div>
                </Card>
              )
            }

            const order = item.data
            const pay = paymentInfoForOrder(order, payments)
            const isDelivered = order.delivery_status === 'delivered'

            return (
              <Card key={`o-${i}`} className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Sale</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{formatDate(item.date)}</p>
                  </div>
                  <p className="font-semibold">{formatINR(order.total_amount)}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Pill tone={isDelivered ? 'paid' : 'gold'}>{DELIVERY_LABELS[order.delivery_status]}</Pill>
                  <Pill tone={pay.status === 'paid' ? 'paid' : pay.status === 'partial' ? 'gold' : 'owe'}>
                    {PAYMENT_LABELS[pay.status]}
                  </Pill>
                </div>

                {order.order_items?.length > 0 && (
                  <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 pt-1.5 border-t border-[var(--color-line)]">
                    {order.order_items.map((it) => `${it.product_name} ×${it.qty}`).join(', ')}
                  </p>
                )}

                {invoices[order.id] && (
                  <div className="flex items-center gap-3 mt-2">
                    <a
                      href={invoices[order.id].pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)]"
                    >
                      📄 {invoices[order.id].invoice_number}
                    </a>
                    {normalizeIndianPhone(shop.phone) && (
                      <button
                        onClick={() => {
                          const inv = invoices[order.id]
                          const message = buildInvoiceWhatsAppMessage({
                            shopName: shop.shop_name,
                            invoiceNumber: inv.invoice_number,
                            total: inv.amount,
                            paymentStatus: inv.payment_status,
                            amountPaid: inv.payment_status === 'paid' ? inv.amount : 0,
                          })
                          openWhatsAppChat({ phone: shop.phone, message })
                        }}
                        className="text-xs font-semibold text-[#25D366]"
                      >
                        Resend on WhatsApp
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--color-line)]">
                  {!isDelivered && (
                    <Link to={`/rep/deliver/${order.id}`} className="text-xs font-semibold text-white bg-[var(--color-brand)] px-2.5 py-1.5 rounded-lg">
                      Mark Delivered
                    </Link>
                  )}
                  {isDelivered && pay.status !== 'paid' && (
                    <Link
                      to={`/rep/record-payment?shop=${shop.id}&order=${order.id}`}
                      className="text-xs font-semibold text-white bg-[var(--color-brand)] px-2.5 py-1.5 rounded-lg"
                    >
                      Collect balance ({formatINR(pay.balance)})
                    </Link>
                  )}
                  {role === 'admin' && (
                    confirmDeleteId === order.id ? (
                      <>
                        <span className="text-xs text-[var(--color-owe)]">Delete this sale?</span>
                        <button
                          onClick={() => deleteSale(order.id)}
                          disabled={deleting}
                          className="text-xs font-semibold text-white bg-[var(--color-owe)] px-2.5 py-1 rounded-lg"
                        >
                          {deleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[var(--color-ink-soft)]">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(order.id)} className="text-xs font-medium text-[var(--color-owe)] ml-auto">
                        Delete
                      </button>
                    )
                  )}
                </div>
                <OrderDateEditor order={order} onUpdated={load} />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
