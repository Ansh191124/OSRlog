import { X, Loader2, Inbox } from 'lucide-react'

export function Badge({ children, tone = 'steel' }) {
  const tones = {
    steel: 'bg-paper-2 text-steel border-line',
    positive: 'bg-positive-soft text-positive border-positive/20',
    negative: 'bg-negative-soft text-negative border-negative/20',
    accent: 'bg-accent-soft text-accent-deep border-accent/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${tones[tone] || tones.steel}`}>
      {children}
    </span>
  )
}

export function StatCard({ label, value, sub, tone = 'default' }) {
  const valueColor = tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-ink'
  return (
    <div className="card p-4 flex flex-col gap-1 min-w-0">
      <span className="label-field">{label}</span>
      <span className={`font-mono text-2xl font-semibold tabular ${valueColor} truncate`}>{value}</span>
      {sub && <span className="text-xs text-steel">{sub}</span>}
    </div>
  )
}

export function LoadState({ label = 'Loading data' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-steel">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div className="card border-negative/30 bg-negative-soft/40 p-4 text-sm text-negative">
      {message}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center border border-dashed border-line rounded">
      <Inbox className="w-6 h-6 text-steel-light" />
      <p className="font-display text-lg text-ink">{title}</p>
      {description && <p className="text-sm text-steel max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 md:p-6 bg-asphalt/60 backdrop-blur-[2px] overflow-y-auto">
      <div className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-6 shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-display text-lg">{title}</h3>
          <button onClick={onClose} className="text-steel hover:text-ink p-1 rounded" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <span className="label-field">{label}</span>
      {children}
    </div>
  )
}

export function Money({ value }) {
  const n = Number(value || 0)
  const tone = n < 0 ? 'text-negative' : n > 0 ? 'text-positive' : 'text-ink'
  return <span className={`tabular font-medium ${tone}`}>{n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-deep mb-1">{eyebrow}</p>}
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {description && <p className="text-sm text-steel mt-1 max-w-xl">{description}</p>}
      </div>
      {action}
    </div>
  )
}
