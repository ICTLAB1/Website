import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { formatINR } from '../../lib/format'
import { Card, SectionTitle, Spinner, Input, PrimaryButton, Pill } from '../../components/ui'

export default function AdminProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', sku: '', hsn_sac: '', unit: 'packet', mrp: '', unit_price: '', stock_qty: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function addProduct(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.unit_price) return setError('Name and price are required')
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      hsn_sac: form.hsn_sac.trim() || null,
      unit: form.unit,
      mrp: form.mrp ? Number(form.mrp) : null,
      unit_price: Number(form.unit_price),
      stock_qty: Number(form.stock_qty || 0),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setForm({ name: '', sku: '', hsn_sac: '', unit: 'packet', mrp: '', unit_price: '', stock_qty: '' })
      load()
    }
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  async function submitStockAdjust(p) {
    const qty = Number(adjustQty)
    if (!qty) return
    await supabase.from('products').update({ stock_qty: Number(p.stock_qty) + qty }).eq('id', p.id)
    await supabase.from('stock_transactions').insert({
      product_id: p.id,
      type: qty > 0 ? 'in' : 'adjustment',
      qty,
      reference: 'manual adjustment',
      created_by: user.id,
    })
    setAdjusting(null)
    setAdjustQty('')
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Products & stock</h1>

      <Card className="p-4 mb-6">
        <p className="font-medium mb-3 text-sm">Add product</p>
        <form onSubmit={addProduct} className="grid sm:grid-cols-7 gap-3 items-end">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. FoxPopz Peri Peri 40g" />
          <Input label="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="optional" />
          <Input label="HSN/SAC" value={form.hsn_sac} onChange={(e) => setForm((f) => ({ ...f, hsn_sac: e.target.value }))} placeholder="e.g. 19041020" />
          <Input label="MRP (₹)" type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} placeholder="printed price" />
          <Input label="Selling price (₹)" type="number" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))} placeholder="per unit" />
          <Input label="Opening stock" type="number" value={form.stock_qty} onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))} placeholder="qty" />
          <PrimaryButton type="submit" disabled={saving} className="py-2.5">{saving ? 'Adding…' : 'Add'}</PrimaryButton>
        </form>
        {error && <p className="text-[var(--color-owe)] text-sm mt-2">{error}</p>}
      </Card>

      <SectionTitle>Catalog ({products.length})</SectionTitle>
      <div className="space-y-2">
        {products.map((p) => (
          <Card key={p.id} className="p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {p.mrp ? <span className="line-through mr-1.5">MRP {formatINR(p.mrp)}</span> : null}
                  <span className="font-semibold text-[var(--color-brand)]">{formatINR(p.unit_price)}</span>/{p.unit} {p.sku && `· SKU ${p.sku}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Pill tone={Number(p.stock_qty) <= 20 ? 'owe' : 'paid'}>{p.stock_qty} in stock</Pill>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-line)]">
              <button onClick={() => toggleActive(p)} className="text-xs font-medium text-[var(--color-ink-soft)]">
                {p.active ? 'Mark inactive' : 'Reactivate'}
              </button>
              {adjusting === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    autoFocus
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="+/- qty"
                    className="w-20 rounded-lg border border-[var(--color-line)] px-2 py-1 text-xs"
                  />
                  <button onClick={() => submitStockAdjust(p)} className="text-xs font-semibold text-white bg-[var(--color-brand)] px-2.5 py-1 rounded-lg">Save</button>
                  <button onClick={() => setAdjusting(null)} className="text-xs text-[var(--color-ink-soft)]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAdjusting(p.id)} className="text-xs font-medium text-[var(--color-brand)]">Adjust stock</button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
