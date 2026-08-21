import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Input, Textarea, PrimaryButton, SecondaryButton } from '../../components/ui'

export default function NewShopkeeper() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ shop_name: '', owner_name: '', phone: '', address: '', area: '' })
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function captureLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.shop_name.trim()) {
      setError('Shop name is required')
      return
    }
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('shopkeepers')
      .insert({
        shop_name: form.shop_name.trim(),
        owner_name: form.owner_name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        area: form.area.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        assigned_rep_id: user.id,
        created_by: user.id,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      navigate(`/rep/shopkeepers/${data.id}`)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Add shop</h1>
      <form onSubmit={handleSubmit}>
        <Input label="Shop name *" value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} placeholder="e.g. Sharma General Store" />
        <Input label="Owner name" value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} placeholder="e.g. Ramesh Sharma" />
        <Input label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" />
        <Input label="Area / locality" value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="e.g. Karol Bagh" />
        <Textarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Full address" />

        <button
          type="button"
          onClick={captureLocation}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-brand)] text-[var(--color-brand)] font-medium py-2.5 mb-4 text-sm"
        >
          📍 {locating ? 'Getting location…' : coords ? 'Location captured ✓' : 'Capture current location'}
        </button>

        {error && <p className="text-[var(--color-owe)] text-sm mb-3">{error}</p>}

        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save shop'}
        </PrimaryButton>
        <div className="h-2" />
        <SecondaryButton type="button" onClick={() => navigate(-1)}>Cancel</SecondaryButton>
      </form>
    </div>
  )
}
