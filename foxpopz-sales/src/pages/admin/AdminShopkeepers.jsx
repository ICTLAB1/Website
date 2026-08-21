import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useBalances } from '../../lib/useBalances'
import { formatINR } from '../../lib/format'
import { exportOutstandingToExcel } from '../../lib/excelExport'
import { Card, Spinner, Pill } from '../../components/ui'

export default function AdminShopkeepers() {
  const [shops, setShops] = useState([])
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [repFilter, setRepFilter] = useState('')
  const { balances, loading: balLoading } = useBalances({ scope: 'all' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [shopsRes, repsRes] = await Promise.all([
      supabase.from('shopkeepers').select('*').order('shop_name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'rep'),
    ])
    setShops(shopsRes.data || [])
    setReps(repsRes.data || [])
    setLoading(false)
  }

  async function reassign(shopId, repId) {
    await supabase.from('shopkeepers').update({ assigned_rep_id: repId || null }).eq('id', shopId)
    load()
  }

  const repMap = Object.fromEntries(reps.map((r) => [r.id, r.full_name]))

  const filtered = shops.filter((s) => {
    const matchesQuery = `${s.shop_name} ${s.owner_name || ''} ${s.area || ''}`.toLowerCase().includes(query.toLowerCase())
    const matchesRep = !repFilter || s.assigned_rep_id === repFilter
    return matchesQuery && matchesRep
  })

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">All shops ({shops.length})</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          placeholder="Search shops…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        />
        <select
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
          <option value="">All reps</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>{r.full_name}</option>
          ))}
        </select>
        <button
          onClick={() => exportOutstandingToExcel(shops, balances)}
          className="text-sm font-semibold text-white bg-[var(--color-brand)] px-4 py-2.5 rounded-lg whitespace-nowrap"
        >
          Export Excel
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => {
          const bal = balances[s.id]?.outstanding || 0
          return (
            <Card key={s.id} className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.shop_name}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] truncate">
                    {[s.owner_name, s.area, s.phone].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                  <p className="text-xs text-[var(--color-brand)] mt-0.5">
                    {repMap[s.assigned_rep_id] || 'Unassigned'}
                  </p>
                </div>
                {!balLoading && <Pill tone={bal > 0 ? 'owe' : 'paid'}>{bal > 0 ? formatINR(bal) : 'Clear'}</Pill>}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--color-line)]">
                <select
                  value={s.assigned_rep_id || ''}
                  onChange={(e) => reassign(s.id, e.target.value)}
                  className="text-xs rounded-lg border border-[var(--color-line)] px-2 py-1.5 bg-white"
                >
                  <option value="">Unassigned</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
