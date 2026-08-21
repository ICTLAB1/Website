import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatINR, formatDate } from '../../lib/format'
import { exportPaymentsToExcel } from '../../lib/excelExport'
import { Card, Spinner, Pill } from '../../components/ui'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [shops, setShops] = useState({})
  const [reps, setReps] = useState({})
  const [loading, setLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [paymentsRes, shopsRes, repsRes] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(200),
      supabase.from('shopkeepers').select('id, shop_name'),
      supabase.from('profiles').select('id, full_name'),
    ])
    setPayments(paymentsRes.data || [])
    setShops(Object.fromEntries((shopsRes.data || []).map((s) => [s.id, s.shop_name])))
    setReps(Object.fromEntries((repsRes.data || []).map((r) => [r.id, r.full_name])))
    setLoading(false)
  }

  if (loading) return <Spinner />

  const filtered = modeFilter ? payments.filter((p) => p.mode === modeFilter) : payments
  const total = filtered.reduce((s, p) => s + Number(p.amount), 0)
  const cashTotal = payments.filter((p) => p.mode === 'cash').reduce((s, p) => s + Number(p.amount), 0)
  const upiTotal = payments.filter((p) => p.mode === 'upi').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Collections ({filtered.length})</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPaymentsToExcel(filtered, { shopsMap: shops, repsMap: reps })}
            className="text-xs font-semibold text-white bg-[var(--color-brand)] px-3 py-2 rounded-lg"
          >
            Export Excel
          </button>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm bg-white"
          >
            <option value="">All modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3.5">
          <p className="text-xs text-[var(--color-ink-soft)]">Total</p>
          <p className="text-lg font-bold text-[var(--color-brand)] mt-1">{formatINR(total)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-[var(--color-ink-soft)]">Cash</p>
          <p className="text-lg font-bold mt-1">{formatINR(cashTotal)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-[var(--color-ink-soft)]">UPI</p>
          <p className="text-lg font-bold mt-1">{formatINR(upiTotal)}</p>
        </Card>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id} className="p-3.5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{shops[p.shopkeeper_id] || 'Shop'}</p>
              <p className="text-xs text-[var(--color-ink-soft)]">{reps[p.rep_id] || 'Rep'} · {formatDate(p.payment_date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="gold">{p.mode.toUpperCase()}</Pill>
              <p className="font-semibold text-[var(--color-paid)]">{formatINR(p.amount)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
