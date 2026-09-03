import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, IdCard, Wrench, Wallet, ClipboardCheck } from 'lucide-react'
import { DriversAPI, MaintenanceAPI, PaymentsAPI, ApprovalsAPI } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { canAccess } from '../lib/roles'

const EMPTY = { licenses: [], maintenance: { pending: [], dueSoon: [] }, payments: [], approvals: [] }

export default function AlertsBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(EMPTY)

  const load = useCallback(async () => {
    const next = { ...EMPTY }
    const jobs = []
    if (canAccess(user, 'drivers')) {
      jobs.push(DriversAPI.expiringLicenses(30).then((r) => { next.licenses = r.data?.data || [] }).catch(() => {}))
    }
    if (canAccess(user, 'maintenance')) {
      jobs.push(MaintenanceAPI.alerts(15).then((r) => {
        const d = r.data?.data || {}
        next.maintenance = { pending: d.pending || [], dueSoon: d.dueSoon || [] }
      }).catch(() => {}))
    }
    if (canAccess(user, 'payments')) {
      jobs.push(PaymentsAPI.list({ status: 'pending', limit: 50 }).then((r) => { next.payments = r.data?.data || [] }).catch(() => {}))
    }
    if (canAccess(user, 'approvals')) {
      jobs.push(ApprovalsAPI.list({ status: 'requested' }).then((r) => { next.approvals = r.data?.data || [] }).catch(() => {}))
    }
    await Promise.all(jobs)
    setData(next)
  }, [user])

  useEffect(() => {
    if (!user) return
    load()
    const timer = window.setInterval(load, 45000)
    return () => window.clearInterval(timer)
  }, [user, load])

  const maintenanceCount = data.maintenance.pending.length + data.maintenance.dueSoon.length
  const total = data.licenses.length + maintenanceCount + data.payments.length + data.approvals.length

  const goTo = (path) => { setOpen(false); navigate(path) }

  const groups = [
    { key: 'licenses', label: 'Driver licenses expiring', icon: IdCard, count: data.licenses.length, path: '/drivers', items: data.licenses.map((d) => `${d.name || 'Driver'} — expires ${String(d.licenseExpiry).slice(0, 10)}`) },
    { key: 'maintenance', label: 'Maintenance due', icon: Wrench, count: maintenanceCount, path: '/maintenance', items: [...data.maintenance.pending, ...data.maintenance.dueSoon].map((m) => `${m.vehicle?.vehicleNo || 'Vehicle'} — ${m.maintenanceType || m.status}`) },
    { key: 'payments', label: 'Payments pending', icon: Wallet, count: data.payments.length, path: '/payments', items: data.payments.map((p) => `${p.partyName || 'Payment'} — ₹${Number(p.amount || 0).toLocaleString('en-IN')}`) },
    { key: 'approvals', label: 'Approvals pending', icon: ClipboardCheck, count: data.approvals.length, path: '/approvals', items: data.approvals.map((a) => a.title) },
  ].filter((g) => canAccess(user, g.key === 'licenses' ? 'drivers' : g.key))

  if (!groups.length) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alerts"
        className="relative p-2 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white text-ink border border-line rounded shadow-2xl z-50">
            <div className="px-4 py-3 border-b border-line font-display text-sm">Alerts</div>
            {total === 0 && <p className="px-4 py-6 text-sm text-steel text-center">Nothing needs attention right now.</p>}
            {groups.map(({ key, label, icon: Icon, count, path, items }) => count > 0 && (
              <div key={key} className="border-b border-line last:border-0">
                <button onClick={() => goTo(path)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-paper-2/60 text-left">
                  <span className="flex items-center gap-2 text-sm font-medium"><Icon className="w-4 h-4 text-accent-deep" /> {label}</span>
                  <span className="text-xs font-semibold bg-accent-soft text-accent-deep rounded-full px-2 py-0.5">{count}</span>
                </button>
                <ul className="px-4 pb-2.5 space-y-1">
                  {items.slice(0, 4).map((text, i) => <li key={i} className="text-xs text-steel truncate">{text}</li>)}
                  {items.length > 4 && <li className="text-xs text-steel">+{items.length - 4} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
