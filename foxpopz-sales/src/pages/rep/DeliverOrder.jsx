import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR, toDatetimeLocalValue } from '../../lib/format'
import { getNextInvoiceNumber } from '../../lib/invoiceNumber'
import { buildInvoicePDF, downloadInvoice, getInvoiceBlob } from '../../lib/invoice'
import { buildUpiQrDataUrl } from '../../lib/upi'
import { saveInvoice } from '../../lib/invoiceStorage'
import { buildInvoiceWhatsAppMessage, openWhatsAppChat, normalizeIndianPhone } from '../../lib/whatsapp'
import { paymentInfoForOrder } from '../../lib/orderStatus'
import { Card, PrimaryButton, SecondaryButton, Spinner, Input } from '../../components/ui'

const PAYMENT_OPTIONS = [
  { key: 'cash_full', mode: 'cash', split: false, icon: '💵', title: 'Cash', subtitle: 'Full amount received in hand right now' },
  { key: 'cash_split', mode: 'cash', split: true, icon: '💵➗', title: 'Cash + Credit', subtitle: 'Part cash now, rest on udhaar' },
  { key: 'upi_full', mode: 'upi', split: false, icon: '📱', title: 'UPI', subtitle: 'Full amount — show QR, shopkeeper scans & pays' },
  { key: 'upi_split', mode: 'upi', split: true, icon: '📱➗', title: 'UPI + Credit', subtitle: 'Part via UPI now, rest on udhaar' },
  { key: 'credit', mode: 'credit', split: false, icon: '📒', title: 'Credit', subtitle: 'Fully on udhaar — added to their outstanding' },
]

export default function DeliverOrder() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [shop, setShop] = useState(null)
  const [items, setItems] = useState([])
  const [existingPayments, setExistingPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const [optionKey, setOptionKey] = useState(null)
  const [amount, setAmount] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(toDatetimeLocalValue())
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: orderRow } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single()
    if (orderRow) {
      const { data: shopRow } = await supabase.from('shopkeepers').select('*').eq('id', orderRow.shopkeeper_id).single()
      const { data: paymentsRows } = await supabase.from('payments').select('*').eq('order_id', id)
      setOrder(orderRow)
      setItems(orderRow.order_items || [])
      setShop(shopRow)
      setExistingPayments(paymentsRows || [])
    }
    setLoading(false)
  }

  const option = PAYMENT_OPTIONS.find((o) => o.key === optionKey)
  const isUpi = option?.mode === 'upi'
  const total = order ? Number(order.total_amount) : 0
  const alreadyPaid = existingPayments.reduce((s, p) => s + Number(p.amount), 0)
  const remaining = Math.max(total - alreadyPaid, 0)

  const effectiveAmount = option
    ? option.split
      ? Number(amount || 0)
      : option.mode === 'credit'
        ? 0
        : remaining
    : 0

  function selectOption(opt) {
    setOptionKey(opt.key)
    setError('')
    if (!opt.split && opt.mode !== 'credit') setAmount(String(remaining))
    if (opt.split) setAmount('')
  }

  useEffect(() => {
    if (!isUpi || !shop) return
    let cancelled = false
    setQrLoading(true)
    buildUpiQrDataUrl({ amount: effectiveAmount || 0, note: `Delivery to ${shop.shop_name}` })
      .then((url) => { if (!cancelled) setQrDataUrl(url) })
      .finally(() => { if (!cancelled) setQrLoading(false) })
    return () => { cancelled = true }
  }, [isUpi, effectiveAmount, shop])

  async function finalize({ paymentMode, amountPaid }) {
    setSaving(true)
    setError('')
    try {
      // 1. mark delivered
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ delivery_status: 'delivered', delivered_at: new Date(deliveryDate).toISOString() })
        .eq('id', order.id)
      if (updateErr) throw updateErr

      // 2. payment (if any)
      if (amountPaid > 0) {
        const { error: payErr } = await supabase.from('payments').insert({
          shopkeeper_id: shop.id,
          order_id: order.id,
          rep_id: user.id,
          amount: amountPaid,
          mode: paymentMode === 'credit' ? 'cash' : paymentMode,
        })
        if (payErr) throw payErr
      }

      const totalPaidNow = alreadyPaid + amountPaid
      const paymentStatus = totalPaidNow >= total ? 'paid' : 'pending'
      const dueQr = paymentStatus === 'pending' ? await buildUpiQrDataUrl({ amount: total - totalPaidNow, note: `Balance due — ${shop.shop_name}` }) : null

      // 3. invoice
      const invoiceNumber = await getNextInvoiceNumber()
      const pdfDoc = buildInvoicePDF({
        invoiceNumber,
        date: new Date(deliveryDate).toISOString(),
        shop,
        rep: profile,
        items,
        discount: Number(order.discount || 0),
        total,
        paymentMode,
        paymentStatus,
        amountPaid: totalPaidNow,
        upiQrDataUrl: dueQr,
      })
      const pdfBlob = getInvoiceBlob(pdfDoc)

      const { publicUrl } = await saveInvoice({
        invoiceNumber,
        orderId: order.id,
        shopkeeperId: shop.id,
        repId: user.id,
        amount: total,
        paymentMode,
        paymentStatus,
        pdfBlob,
      })

      downloadInvoice(pdfDoc, invoiceNumber)

      setResult({ invoiceNumber, total, paymentMode, paymentStatus, amountPaid: totalPaidNow })
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setSaving(false)
    }
  }

  function confirm() {
    if (!option) return
    if (option.split && (!amount || Number(amount) <= 0)) {
      setError('Enter the amount collected')
      return
    }
    if (option.split && Number(amount) >= remaining) {
      setError('That covers the full balance — pick Cash or UPI (full) instead')
      return
    }
    finalize({ paymentMode: option.mode, amountPaid: effectiveAmount })
  }

  if (loading) return <Spinner />
  if (!order || !shop) return <p className="text-center text-[var(--color-ink-soft)] py-10">Order not found.</p>

  if (result) {
    const hasPhone = Boolean(normalizeIndianPhone(shop.phone))
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-xl font-semibold">Delivered — {result.invoiceNumber}</h1>
        <p className="text-[var(--color-ink-soft)] text-sm mt-1">
          {formatINR(result.total)} · {result.paymentStatus === 'paid' ? `Paid via ${result.paymentMode.toUpperCase()}` : `${formatINR(result.total - result.amountPaid)} on credit`}
        </p>
        <p className="text-xs text-[var(--color-ink-soft)] mt-1">Invoice PDF downloaded to your device.</p>
        <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={() => openWhatsAppChat({
              phone: shop.phone,
              message: buildInvoiceWhatsAppMessage({ shopName: shop.shop_name, invoiceNumber: result.invoiceNumber, total: result.total, paymentStatus: result.paymentStatus, amountPaid: result.amountPaid }),
            })}
            disabled={!hasPhone}
            className="w-full rounded-xl bg-[#25D366] text-white font-semibold py-3.5 text-base active:scale-[0.98] transition disabled:opacity-40"
          >
            Send on WhatsApp
          </button>
          <PrimaryButton onClick={() => navigate(`/rep/shopkeepers/${shop.id}`)}>View shop ledger</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/rep/orders')}>Back to orders</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-[var(--color-brand)] font-medium mb-3">← Back</button>
      <h1 className="text-xl font-semibold mb-1">Confirm delivery & payment</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{shop.shop_name} · Order total {formatINR(total)}</p>

      <Card className="p-3.5 mb-4">
        <p className="text-xs text-[var(--color-ink-soft)] mb-1">Items</p>
        <p className="text-sm">{items.map((it) => `${it.product_name} ×${it.qty}`).join(', ')}</p>
      </Card>

      <Input
        label="Delivery date & time"
        type="datetime-local"
        value={deliveryDate}
        onChange={(e) => setDeliveryDate(e.target.value)}
        max={toDatetimeLocalValue()}
      />

      {!option && (
        <div className="grid grid-cols-1 gap-2.5">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => selectOption(opt)}
              className="text-left bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-4 active:scale-[0.98] transition"
            >
              <p className="font-semibold">{opt.icon} {opt.title}</p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{opt.subtitle}</p>
            </button>
          ))}
        </div>
      )}

      {option && option.mode === 'credit' && (
        <Card className="p-4">
          <p className="text-sm text-[var(--color-ink-soft)] mb-4">
            Full amount of {formatINR(remaining)} will be added to {shop.shop_name}'s outstanding balance.
          </p>
          {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}
          <PrimaryButton disabled={saving} onClick={confirm}>
            {saving ? 'Saving…' : 'Confirm — mark delivered on credit'}
          </PrimaryButton>
          <div className="h-2" />
          <SecondaryButton type="button" onClick={() => setOptionKey(null)}>Change method</SecondaryButton>
        </Card>
      )}

      {option && option.mode === 'cash' && (
        <Card className="p-4">
          {option.split ? (
            <Input
              label="Cash amount received now"
              type="number"
              min="0"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. half now"
            />
          ) : (
            <div className="mb-4 p-3 rounded-lg bg-[var(--color-brand-soft)] text-center">
              <p className="text-xs text-[var(--color-ink-soft)]">Full amount</p>
              <p className="text-lg font-bold text-[var(--color-brand)]">{formatINR(remaining)}</p>
            </div>
          )}
          {option.split && Number(amount) > 0 && Number(amount) < remaining && (
            <p className="text-xs text-[var(--color-owe)] -mt-2 mb-3">
              Balance {formatINR(remaining - Number(amount || 0))} will stay on credit.
            </p>
          )}
          {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}
          <PrimaryButton disabled={saving} onClick={confirm}>
            {saving ? 'Saving…' : `Confirm cash — ${formatINR(effectiveAmount || 0)}`}
          </PrimaryButton>
          <div className="h-2" />
          <SecondaryButton type="button" onClick={() => setOptionKey(null)}>Change method</SecondaryButton>
        </Card>
      )}

      {option && option.mode === 'upi' && (
        <Card className="p-4">
          {option.split && (
            <Input
              label="UPI amount to collect now"
              type="number"
              min="0"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. half now"
            />
          )}
          <div className="flex flex-col items-center py-4 bg-[var(--color-brand-soft)] rounded-xl mb-3">
            {qrLoading || !qrDataUrl || (option.split && !amount) ? (
              <div className="h-48 w-48 flex items-center justify-center">
                {option.split && !amount ? (
                  <p className="text-xs text-[var(--color-ink-soft)] text-center px-6">Enter an amount above to generate the QR code</p>
                ) : (
                  <Spinner />
                )}
              </div>
            ) : (
              <img src={qrDataUrl} alt="UPI QR code" className="h-48 w-48 rounded-lg bg-white p-2" />
            )}
            <p className="text-xs text-[var(--color-brand)] font-medium mt-2">Ask shopkeeper to scan with any UPI app</p>
          </div>
          {option.split && Number(amount) > 0 && Number(amount) < remaining && (
            <p className="text-xs text-[var(--color-owe)] mb-3">
              Balance {formatINR(remaining - Number(amount || 0))} will stay on credit.
            </p>
          )}
          {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}
          <PrimaryButton disabled={saving} onClick={confirm}>
            {saving ? 'Saving…' : 'Payment received — Save'}
          </PrimaryButton>
          <div className="h-2" />
          <SecondaryButton type="button" disabled={saving} onClick={() => finalize({ paymentMode: 'credit', amountPaid: 0 })}>
            Not paid yet — deliver on credit
          </SecondaryButton>
          <div className="h-2" />
          <button type="button" onClick={() => setOptionKey(null)} className="w-full text-center text-sm text-[var(--color-ink-soft)] py-1">Change method</button>
        </Card>
      )}
    </div>
  )
}
