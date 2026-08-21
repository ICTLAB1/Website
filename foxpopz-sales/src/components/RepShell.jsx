import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/rep', label: 'Home', end: true, icon: HomeIcon },
  { to: '/rep/orders', label: 'Orders', icon: OrdersIcon },
  { to: '/rep/new-order', label: 'Take Order', icon: PlusIcon, primary: true },
  { to: '/rep/shopkeepers', label: 'Shops', icon: ShopIcon },
  { to: '/rep/ledger', label: 'Ledger', icon: BookIcon },
]

export default function RepShell() {
  const { role, signOut, profile } = useAuth()
  // Note: admins are intentionally allowed here too (not redirected away) —
  // an admin/owner often needs to log their own test sales or field sales.

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="sticky top-0 z-10 bg-[var(--color-brand)] text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-[var(--color-brand-soft)]/70 leading-none">FoxPopz Sales</p>
          <p className="font-semibold leading-tight">{profile?.full_name || 'Rep'}</p>
        </div>
        <div className="flex items-center gap-2">
          {(role === 'admin' || role === 'manager') && (
            <a href="/admin" className="text-xs bg-[var(--color-gold)] text-[var(--color-brand-dark)] font-semibold rounded-full px-3 py-1.5 transition">
              {role === 'admin' ? 'Admin' : 'Manager'}
            </a>
          )}
          <button
            onClick={signOut}
            className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 px-4 pt-4 max-w-lg w-full mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-line)] safe-bottom z-20">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  tab.primary
                    ? ''
                    : isActive
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-ink-soft)]'
                }`
              }
            >
              {({ isActive }) =>
                tab.primary ? (
                  <>
                    <span className="-mt-6 h-12 w-12 rounded-full bg-[var(--color-gold)] flex items-center justify-center shadow-md text-[var(--color-brand-dark)]">
                      <tab.icon />
                    </span>
                    <span className="mt-0.5 text-[var(--color-ink-soft)]">{tab.label}</span>
                  </>
                ) : (
                  <>
                    <tab.icon active={isActive} />
                    <span>{tab.label}</span>
                  </>
                )
              }
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function HomeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-brand)' : 'currentColor'} strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function OrdersIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-brand)' : 'currentColor'} strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h8M8 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ShopIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-brand)' : 'currentColor'} strokeWidth="2">
      <path d="M4 9V21h16V9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9l1.5-5h17L22 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
function BookIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-brand)' : 'currentColor'} strokeWidth="2">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
