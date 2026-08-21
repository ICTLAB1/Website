import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Computes { [shopkeeper_id]: { totalOrders, totalPaid, outstanding, lastActivity } }
// Scope: 'mine' (RLS-filtered to current rep) or 'all' (admin, all rows).
export function useBalances({ scope = 'mine', repId } = {}) {
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let ordersQuery = supabase.from('orders').select('shopkeeper_id, total_amount, order_date, rep_id')
    let paymentsQuery = supabase.from('payments').select('shopkeeper_id, amount, payment_date, rep_id')

    if (scope === 'mine' && repId) {
      ordersQuery = ordersQuery.eq('rep_id', repId)
      paymentsQuery = paymentsQuery.eq('rep_id', repId)
    }

    const [ordersRes, paymentsRes] = await Promise.all([ordersQuery, paymentsQuery])
    const orders = ordersRes.data || []
    const payments = paymentsRes.data || []

    const map = {}
    for (const o of orders) {
      const k = o.shopkeeper_id
      if (!map[k]) map[k] = { totalOrders: 0, totalPaid: 0, lastActivity: o.order_date }
      map[k].totalOrders += Number(o.total_amount)
      if (new Date(o.order_date) > new Date(map[k].lastActivity)) map[k].lastActivity = o.order_date
    }
    for (const p of payments) {
      const k = p.shopkeeper_id
      if (!map[k]) map[k] = { totalOrders: 0, totalPaid: 0, lastActivity: p.payment_date }
      map[k].totalPaid += Number(p.amount)
      if (new Date(p.payment_date) > new Date(map[k].lastActivity)) map[k].lastActivity = p.payment_date
    }
    for (const k of Object.keys(map)) {
      map[k].outstanding = map[k].totalOrders - map[k].totalPaid
    }
    setBalances(map)
    setLoading(false)
  }, [scope, repId])

  useEffect(() => {
    load()
  }, [load])

  return { balances, loading, reload: load }
}
