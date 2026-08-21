import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toDatetimeLocalValue, formatDateTime } from '../lib/format'
import { useAuth } from '../context/AuthContext'

// Lets an admin or manager correct an order's date or delivery date after
// the fact — e.g. a paper order entered a day late, or a delivery logged
// at the wrong time. Sales persons don't get this control (see
// supabase/manager-role.sql for who can do what).
export default function OrderDateEditor({ order, onUpdated }) {
  const { role } = useAuth()
  const [editing, setEditing] = useState(false)
  const [orderDate, setOrderDate] = useState(toDatetimeLocalValue(order.order_date))
  const [deliveredDate, setDeliveredDate] = useState(order.delivered_at ? toDatetimeLocalValue(order.delivered_at) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (role !== 'admin' && role !== 'manager') return null

  async function save() {
    setSaving(true)
    setError('')
    const payload = { order_date: new Date(orderDate).toISOString() }
    if (order.delivery_status === 'delivered') {
      if (!deliveredDate) {
        setError('Delivery date is required for a delivered order')
        setSaving(false)
        return
      }
      payload.delivered_at = new Date(deliveredDate).toISOString()
    }
    const { error: err } = await supabase.from('orders').update(payload).eq('id', order.id)
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setEditing(false)
      onUpdated?.()
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs font-medium text-[var(--color-brand)]">
        Edit dates
      </button>
    )
  }

  return (
    <div className="w-full bg-[var(--color-brand-soft)] rounded-xl p-3 mt-2">
      <label className="block mb-2">
        <span className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">Order date & time</span>
        <input
          type="datetime-local"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          max={toDatetimeLocalValue()}
          className="w-full rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-sm bg-white"
        />
      </label>
      {order.delivery_status === 'delivered' && (
        <label className="block mb-2">
          <span className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">Delivery date & time</span>
          <input
            type="datetime-local"
            value={deliveredDate}
            onChange={(e) => setDeliveredDate(e.target.value)}
            max={toDatetimeLocalValue()}
            className="w-full rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-sm bg-white"
          />
        </label>
      )}
      {error && <p className="text-xs text-[var(--color-owe)] mb-2">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="text-xs font-semibold text-white bg-[var(--color-brand)] px-3 py-1.5 rounded-lg">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-[var(--color-ink-soft)]">Cancel</button>
      </div>
    </div>
  )
}
