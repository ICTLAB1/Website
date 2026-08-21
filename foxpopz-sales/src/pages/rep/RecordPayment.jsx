import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useBalances } from '../../lib/useBalances'
import { formatINR } from '../../lib/format'
import { Select, Input, Textarea, PrimaryButton, SecondaryButton, Spinner, Card } from '../../components/ui'

export default function RecordPayment() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedShop = searchParams.get('shop')
  const preselectedOrder = searchParams.get('order')
  const isStaff = role === 'admin' || role === 'manager'

  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [shopId, setShopId] = useState(preselectedShop || '')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Admins/managers collect against any shop; sales persons only their own.
  const { balances } = useBalances(isStaff ? { scope: 'all' } : { scope: 'mine', repId: user?.id })

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    let query = supabase.from('shopkeepers').select('id, shop_name').order('shop_name')
    if (!isStaff) query = query.eq('assigned_rep_id', user.id)
    const { data } = await query
    setShops(data || [])
    setLoading(false)
  }

  const outstanding = shopId ? (balances[shopId]?.outstanding || 0) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!shopId) return setError('Select a shop')
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount')

    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      shopkeeper_id: shopId,
      order_id: preselectedOrder || null,
      rep_id: user.id,
      amount: Number(amount),
      mode,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (loading) return <Spinner />

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-xl font-semibold">Payment recorded</h1>
        <p className="text-[var(--color-ink-soft)] text-sm mt-1">{formatINR(amount)} via {mode.toUpperCase()}</p>
        <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          <PrimaryButton onClick={() => navigate(`/rep/shopkeepers/${shopId}`)}>View shop ledger</PrimaryButton>
          <SecondaryButton onClick={() => { setDone(false); setAmount(''); setNotes(''); }}>Collect another</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Collect payment</h1>
      <form onSubmit={handleSubmit}>
        <Select label="Shop *" value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={Boolean(preselectedShop)}>
          <option value="">Select shop</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.shop_name}</option>
          ))}
        </Select>

        {shopId && outstanding !== null && (
          <Card className="p-3.5 mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--color-ink-soft)]">Current outstanding</p>
            <p className={`font-semibold ${outstanding > 0 ? 'text-[var(--color-owe)]' : 'text-[var(--color-paid)]'}`}>
              {outstanding > 0 ? formatINR(outstanding) : 'Clear'}
            </p>
          </Card>
        )}

        <Input
          label="Amount received *"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="₹"
        />

        <p className="text-sm font-medium text-[var(--color-ink-soft)] mb-2">Payment mode</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['cash', 'upi'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-3 rounded-xl font-semibold text-sm transition ${
                mode === m ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. UTR / reference number" />

        {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}

        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Record payment'}
        </PrimaryButton>
      </form>
    </div>
  )
}
