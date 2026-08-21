import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR, toDatetimeLocalValue } from '../../lib/format'
import { businessConfig } from '../../lib/businessConfig'
import { buildOrderReceivedMessage, openWhatsAppChat, normalizeIndianPhone } from '../../lib/whatsapp'
import { Card, Select, Input, PrimaryButton, SecondaryButton, Spinner } from '../../components/ui'

export default function NewOrder() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedShop = searchParams.get('shop')
  const isStaff = role === 'admin' || role === 'manager'

  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [shopId, setShopId] = useState(preselectedShop || '')
  const [lines, setLines] = useState([{ product_id: '', qty: 1 }])
  const [discount, setDiscount] = useState('')
  const [orderDate, setOrderDate] = useState(toDatetimeLocalValue())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    let shopsQuery = supabase.from('shopkeepers').select('*').order('shop_name')
    if (!isStaff) shopsQuery = shopsQuery.eq('assigned_rep_id', user.id)
    const [shopsRes, productsRes] = await Promise.all([
      shopsQuery,
      supabase.from('products').select('*').eq('active', true).order('name'),
    ])
    setShops(shopsRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  function updateLine(idx, field, value) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }
  function addLine() {
    setLines((ls) => [...ls, { product_id: '', qty: 1 }])
  }
  function removeLine(idx) {
    setLines((ls) => ls.filter((_, i) => i !== idx))
  }

  const validLines = lines.filter((l) => l.product_id && Number(l.qty) > 0)
  const subtotal = validLines.reduce((sum, l) => {
    const p = products.find((p) => p.id === l.product_id)
    return sum + (p ? Number(p.unit_price) * Number(l.qty) : 0)
  }, 0)
  const discountAmount = Math.min(Number(discount || 0), subtotal)
  const taxable = subtotal - discountAmount
  const hasGst = Boolean(businessConfig.gstin)
  const gstAmount = hasGst ? (taxable * businessConfig.defaultGstRate) / 100 : 0
  // This is the amount actually owed — GST-inclusive — and it's what gets
  // saved as order.total_amount. It must match the invoice's Grand Total
  // exactly, or the ledger and the invoice would disagree about what's due.
  const total = taxable + gstAmount
  const selectedShop = shops.find((s) => s.id === shopId)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!shopId) return setError('Select a shop')
    if (validLines.length === 0) return setError('Add at least one product')

    setSaving(true)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        shopkeeper_id: shopId,
        rep_id: user.id,
        total_amount: total,
        discount: discountAmount,
        notes: notes.trim() || null,
        delivery_status: 'order_received',
        order_date: new Date(orderDate).toISOString(),
      })
      .select()
      .single()

    if (orderErr) {
      setError(orderErr.message)
      setSaving(false)
      return
    }

    const itemsPayload = validLines.map((l) => {
      const p = products.find((p) => p.id === l.product_id)
      return {
        order_id: order.id,
        product_id: p.id,
        product_name: p.name,
        hsn_sac: p.hsn_sac || null,
        qty: Number(l.qty),
        unit_price: Number(p.unit_price),
        mrp: p.mrp ? Number(p.mrp) : null,
        subtotal: Number(p.unit_price) * Number(l.qty),
      }
    })
    const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload)
    setSaving(false)
    if (itemsErr) {
      setError(itemsErr.message)
      return
    }

    setSaved({ orderId: order.id, total, itemCount: validLines.length })
  }

  if (loading) return <Spinner />

  if (saved) {
    const hasPhone = Boolean(normalizeIndianPhone(selectedShop?.phone))
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-3">📝</div>
        <h1 className="text-xl font-semibold">Order received</h1>
        <p className="text-[var(--color-ink-soft)] text-sm mt-1">{selectedShop?.shop_name} · {formatINR(saved.total)}</p>
        <p className="text-xs text-[var(--color-ink-soft)] mt-1">It's saved to the company's order list. Mark it delivered once the goods go out.</p>

        <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={() => openWhatsAppChat({
              phone: selectedShop?.phone,
              message: buildOrderReceivedMessage({ shopName: selectedShop?.shop_name, total: saved.total, itemCount: saved.itemCount }),
            })}
            disabled={!hasPhone}
            className="w-full rounded-xl bg-[#25D366] text-white font-semibold py-3.5 text-base active:scale-[0.98] transition disabled:opacity-40"
          >
            Notify shop on WhatsApp
          </button>
          <PrimaryButton onClick={() => navigate(`/rep/deliver/${saved.orderId}`)}>Mark delivered now instead</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/rep/orders')}>View all orders</SecondaryButton>
          <button onClick={() => navigate(0)} className="text-sm text-[var(--color-ink-soft)] py-1">Take another order</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Take order</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">Just capture what they want — you'll confirm delivery and payment later.</p>
      <form onSubmit={handleSubmit}>
        <Select label="Shop *" value={shopId} onChange={(e) => setShopId(e.target.value)}>
          <option value="">Select shop</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.shop_name}</option>
          ))}
        </Select>
        {shops.length === 0 && (
          <p className="text-xs text-[var(--color-ink-soft)] -mt-3 mb-4">
            No shops yet. <Link to="/rep/shopkeepers/new" className="text-[var(--color-brand)] font-medium">Add one first</Link>.
          </p>
        )}

        <p className="text-sm font-medium text-[var(--color-ink-soft)] mb-1">Products</p>
        <div className="space-y-2 mb-2">
          {lines.map((line, idx) => {
            const p = products.find((pr) => pr.id === line.product_id)
            return (
              <Card key={idx} className="p-3">
                <div className="flex gap-2 items-start">
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-line)] px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatINR(p.unit_price)}/{p.unit}{p.mrp ? ` (MRP ${formatINR(p.mrp)})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                    className="w-20 rounded-lg border border-[var(--color-line)] px-2.5 py-2 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                  />
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="text-[var(--color-owe)] px-1 text-lg leading-none">×</button>
                  )}
                </div>
                {p && <p className="text-xs text-[var(--color-ink-soft)] mt-1.5">Subtotal: {formatINR(p.unit_price * line.qty)}</p>}
              </Card>
            )
          })}
        </div>
        <button type="button" onClick={addLine} className="text-sm font-medium text-[var(--color-brand)] mb-4">+ Add another product</button>

        <Input
          label="Discount (₹, optional)"
          type="number"
          min="0"
          max={subtotal}
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="0"
        />

        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between text-sm text-[var(--color-ink-soft)]">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--color-owe)] mt-1">
              <span>Discount</span>
              <span>-{formatINR(discountAmount)}</span>
            </div>
          )}
          {hasGst && (
            <div className="flex items-center justify-between text-sm text-[var(--color-ink-soft)] mt-1">
              <span>GST ({businessConfig.defaultGstRate}%)</span>
              <span>+{formatINR(gstAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-line)]">
            <p className="font-medium">Order total</p>
            <p className="text-xl font-bold text-[var(--color-brand)]">{formatINR(total)}</p>
          </div>
        </Card>

        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. deliver by Friday" />

        <Input
          label="Order date & time"
          type="datetime-local"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          max={toDatetimeLocalValue()}
        />

        {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}

        <PrimaryButton type="submit" disabled={saving || total === 0}>
          {saving ? 'Saving…' : `Save order — ${formatINR(total)}`}
        </PrimaryButton>
      </form>
    </div>
  )
}
