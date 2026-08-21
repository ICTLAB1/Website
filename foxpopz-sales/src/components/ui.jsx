export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-6 first:mt-0">
      <h2 className="text-sm font-semibold text-[var(--color-ink-soft)] uppercase tracking-wide">{children}</h2>
      {action}
    </div>
  )
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-medium text-[var(--color-ink)]">{title}</p>
      {subtitle && <p className="text-sm text-[var(--color-ink-soft)] mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function Pill({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]',
    owe: 'bg-[var(--color-owe-soft)] text-[var(--color-owe)]',
    paid: 'bg-[var(--color-paid-soft)] text-[var(--color-paid)]',
    gold: 'bg-[var(--color-gold-soft)] text-[var(--color-gold-dark)]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-[var(--color-brand)] text-white font-semibold py-3.5 text-base active:scale-[0.98] transition disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold py-3.5 text-base active:scale-[0.98] transition disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ label, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">{label}</span>}
      <input
        className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        {...props}
      />
    </label>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">{label}</span>}
      <select
        className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-[var(--color-ink-soft)] mb-1">{label}</span>}
      <textarea
        className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        rows={3}
        {...props}
      />
    </label>
  )
}
