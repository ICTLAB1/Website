import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useBalances } from '../../lib/useBalances'
import { formatINR } from '../../lib/format'
import { Card, EmptyState, Spinner, Pill } from '../../components/ui'

export default function Shopkeepers() {
  const { user } = useAuth()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const { balances, loading: balLoading } = useBalances({ scope: 'mine', repId: user?.id })

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('shopkeepers')
      .select('*')
      .eq('assigned_rep_id', user.id)
      .order('shop_name')
    setShops(data || [])
    setLoading(false)
  }

  const filtered = shops.filter((s) =>
    `${s.shop_name} ${s.owner_name || ''} ${s.area || ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Your shops</h1>
        <Link to="/rep/shopkeepers/new" className="text-sm font-semibold text-white bg-[var(--color-brand)] px-3 py-2 rounded-lg">
          + Add shop
        </Link>
      </div>

      <input
        placeholder="Search by shop, owner, or area…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 mb-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
      />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No shops found"
          subtitle={shops.length === 0 ? 'Add your first shopkeeper to start selling.' : 'Try a different search.'}
          action={
            shops.length === 0 && (
              <Link to="/rep/shopkeepers/new" className="text-sm font-semibold text-white bg-[var(--color-brand)] px-4 py-2 rounded-lg inline-block">
                Add shop
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const bal = balances[s.id]?.outstanding || 0
            return (
              <Link key={s.id} to={`/rep/shopkeepers/${s.id}`}>
                <Card className="p-3.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.shop_name}</p>
                    <p className="text-xs text-[var(--color-ink-soft)] truncate">
                      {[s.owner_name, s.area].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                  {!balLoading && (
                    <Pill tone={bal > 0 ? 'owe' : 'paid'}>
                      {bal > 0 ? formatINR(bal) : 'Clear'}
                    </Pill>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
