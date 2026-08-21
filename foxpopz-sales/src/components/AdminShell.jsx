import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const baseLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/orders', label: 'Sales' },
  { to: '/admin/payments', label: 'Collections' },
  { to: '/admin/shopkeepers', label: 'Shops' },
  { to: '/admin/products', label: 'Products' },
]
const adminOnlyLink = { to: '/admin/reps', label: 'Reps' }

export default function AdminShell() {
  const { role, signOut, profile } = useAuth()
  // Admins and managers both get the admin console — managers have full
  // operational authority over orders/shops/payments/products, but can't
  // delete a sale or manage team logins (see supabase/manager-role.sql).
  if (role !== 'admin' && role !== 'manager') return <Navigate to="/rep" replace />

  const links = role === 'admin' ? [...baseLinks, adminOnlyLink] : baseLinks
  const roleLabel = role === 'admin' ? 'Admin' : 'Manager'

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 bg-[var(--color-brand)] text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-brand-soft)]/70 leading-none">FoxPopz Sales — {roleLabel}</p>
            <p className="font-semibold leading-tight">{profile?.full_name || roleLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/rep" className="text-xs bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-semibold rounded-full px-3 py-1.5 transition">
              Log a sale
            </a>
            <button onClick={signOut} className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition">
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto border-t border-white/10">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition ${
                  isActive ? 'border-[var(--color-gold)] text-white' : 'border-transparent text-[var(--color-brand-soft)]/70'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}
