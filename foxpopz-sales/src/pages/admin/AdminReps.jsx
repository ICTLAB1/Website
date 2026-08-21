import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Card, SectionTitle, Spinner, Pill, Input, Select, PrimaryButton } from '../../components/ui'

export default function AdminReps() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const [form, setForm] = useState({ email: '', full_name: '', phone: '', role: 'rep' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdCreds, setCreatedCreds] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles(data || [])
    setLoading(false)
  }

  async function updateField(id, field, value) {
    setSavingId(id)
    await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
    setSavingId(null)
  }

  async function addTeamMember(e) {
    e.preventDefault()
    setCreateError('')
    setCreatedCreds(null)
    if (!form.email.trim() || !form.full_name.trim()) {
      setCreateError('Email and name are required')
      return
    }
    setCreating(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      },
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    })
    setCreating(false)
    if (error) {
      setCreateError(error.message || 'Could not create account')
      return
    }
    if (data?.error) {
      setCreateError(data.error)
      return
    }
    setCreatedCreds(data)
    setForm({ email: '', full_name: '', phone: '', role: 'rep' })
    load()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Team</h1>
      <p className="text-sm text-[var(--color-ink-soft)] mb-1">
        Add reps or other admins directly below — no need to go into Supabase.
      </p>
      <p className="text-xs text-[var(--color-ink-soft)] mb-4">
        <strong>Sales Person:</strong> takes orders, marks their own deliveries/payments. Can't delete anything. ·{' '}
        <strong>Manager:</strong> sees and manages every order, shop, and payment company-wide. Can't delete or add team members. ·{' '}
        <strong>Admin:</strong> full authority, including deleting a sale and adding team members.
      </p>

      <Card className="p-4 mb-6">
        <p className="font-medium mb-3 text-sm">Add team member</p>
        <form onSubmit={addTeamMember} className="grid sm:grid-cols-4 gap-3 items-end">
          <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Rahul Verma" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="rahul@foxpopz.com" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="optional" />
          <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="rep">Sales Person</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
          <div className="sm:col-span-4">
            <PrimaryButton type="submit" disabled={creating} style={{ width: 'auto', paddingLeft: 24, paddingRight: 24 }}>
              {creating ? 'Creating…' : 'Create login'}
            </PrimaryButton>
          </div>
        </form>
        {createError && <p className="text-[var(--color-owe)] text-sm mt-3">{createError}</p>}
        {createdCreds && (
          <Card className="p-3.5 mt-3 bg-[var(--color-gold-soft)] border-none">
            <p className="text-sm font-semibold text-[var(--color-brand-dark)]">Account created ✅</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              Share these login details with them directly (e.g. WhatsApp) — this password is shown only once:
            </p>
            <p className="text-sm font-mono mt-2">Email: {createdCreds.email}</p>
            <p className="text-sm font-mono">Password: {createdCreds.password}</p>
          </Card>
        )}
      </Card>

      <SectionTitle>All accounts</SectionTitle>
      <div className="space-y-3">
        {profiles.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <Input
                label="Full name"
                defaultValue={p.full_name}
                onBlur={(e) => e.target.value !== p.full_name && updateField(p.id, 'full_name', e.target.value)}
              />
              <Input
                label="Phone"
                defaultValue={p.phone || ''}
                onBlur={(e) => e.target.value !== p.phone && updateField(p.id, 'phone', e.target.value)}
              />
              <Select
                label="Role"
                value={p.role}
                onChange={(e) => updateField(p.id, 'role', e.target.value)}
              >
                <option value="rep">Sales Person</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Pill tone={p.active ? 'paid' : 'owe'}>{p.active ? 'Active' : 'Inactive'}</Pill>
                <Pill tone={p.role === 'admin' ? 'gold' : 'default'}>
                  {{ rep: 'Sales Person', manager: 'Manager', admin: 'Admin' }[p.role] || p.role}
                </Pill>
              </div>
              <button
                onClick={() => updateField(p.id, 'active', !p.active)}
                className="text-xs font-medium text-[var(--color-brand)]"
                disabled={savingId === p.id}
              >
                {p.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
