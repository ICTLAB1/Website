import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useBalances } from '../../lib/useBalances'
import { formatINR } from '../../lib/format'
import { Card, EmptyState, Spinner } from '../../components/ui'

export default function Ledger() {
  const { user } = useAuth()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const { balances, loading: balLoading } = useBalances({ scope: 'mine', repId: user?.id })

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('shopkeepers').select('id, shop_name, area').eq('assigned_rep_id', user.id)
    setShops(data || [])
    setLoading(false)
  }

  if (loading || balLoading) return <Spinner />

  const withBalance = shops
    .map((s) => ({ ...s, outstanding: balances[s.id]?.outstanding || 0 }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)

  const total = withBalance.reduce((sum, s) => sum + s.outstanding, 0)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Khata — money owed to you</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{withBalance.length} shops with dues</p>

      <Card className="p-4 khata-lines mb-4">
        <p className="text-xs text-[var(--color-ink-soft)]">Total outstanding</p>
        <p className="text-2xl font-bold text-[var(--color-owe)] mt-1">{formatINR(total)}</p>
      </Card>

      {withBalance.length === 0 ? (
        <EmptyState title="All clear!" subtitle="None of your shops currently owe you money." />
      ) : (
        <div className="space-y-2">
          {withBalance.map((s) => (
            <Link key={s.id} to={`/rep/shopkeepers/${s.id}`}>
              <Card className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.shop_name}</p>
                  {s.area && <p className="text-xs text-[var(--color-ink-soft)]">{s.area}</p>}
                </div>
                <p className="font-semibold text-[var(--color-owe)]">{formatINR(s.outstanding)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
