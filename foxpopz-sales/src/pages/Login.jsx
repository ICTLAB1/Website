import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) setError(error.message === 'Invalid login credentials'
      ? 'Wrong email or password. Check with your admin.'
      : error.message)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-brand)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-gold)] text-[var(--color-brand-dark)] text-2xl font-bold mb-3">
            F
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">FoxPopz Sales</h1>
          <p className="text-[var(--color-brand-soft)]/70 text-sm mt-1">Field sales & khata, in one place</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-xl">
          <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            placeholder="you@foxpopz.com"
            autoComplete="email"
          />
          <label className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 mb-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && <p className="text-[var(--color-owe)] text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 rounded-lg bg-[var(--color-brand)] text-white font-semibold py-3 active:scale-[0.98] transition disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-[var(--color-brand-soft)]/60 text-xs mt-6">
          Accounts are created by your admin. Contact them if you need access.
        </p>
      </div>
    </div>
  )
}
