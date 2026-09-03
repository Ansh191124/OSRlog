import { useEffect, useState, useCallback } from 'react'
import { DriversAPI } from '../lib/api'
import TripPerformanceModal from '../components/TripPerformanceModal'
import { Modal, PageHeader, Badge, Field, Money, LoadState, ErrorState, EmptyState } from '../components/ui'
import { Trash2, Lock, LockOpen, Pencil, Search, Plus, ChevronLeft, ChevronRight, Phone, IdCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { name: '', phone: '', licenseNumber: '', licenseExpiry: '', driverType: 'permanent', temporaryUntil: '', address: '', salary: '', status: 'active' }

export default function Drivers() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [mandatoryUnlocked, setMandatoryUnlocked] = useState(false)
  const [performanceTarget, setPerformanceTarget] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await DriversAPI.list({ search: search || undefined, page, limit: 10, includePerformance: true })
      const data = res.data?.data || res.data || []
      setRows(Array.isArray(data) ? data : [])
      const pg = res.data?.pagination
      setTotalPages(pg ? Math.max(1, Math.ceil(pg.total / pg.limit)) : 1)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load drivers from the API.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  const openPerformance = async (row) => {
    setPerformanceTarget(row)
    setPerformance(null)
    setPerformanceError(null)
    setPerformanceLoading(true)
    try {
      const res = await DriversAPI.performance(row._id)
      setPerformance(res.data?.data || null)
    } catch (err) {
      setPerformanceError(err?.response?.data?.message || 'Could not load driver earnings.')
    } finally {
      setPerformanceLoading(false)
    }
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setMandatoryUnlocked(false); setModalOpen(true) }
  const openEdit = (row) => {
    setPerformanceTarget(null)
    setEditing(row)
    setMandatoryUnlocked(false)
    setForm({
      name: row.name || '', phone: row.phone || '', licenseNumber: row.licenseNumber || '',
      licenseExpiry: row.licenseExpiry ? row.licenseExpiry.slice(0, 10) : '',
      driverType: row.driverType || 'permanent', temporaryUntil: row.temporaryUntil ? row.temporaryUntil.slice(0, 10) : '', address: row.address || '', salary: row.salaryAmount ?? '', status: row.status || 'active',
    })
    setModalOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, salaryAmount: form.salary === '' ? undefined : Number(form.salary) }; delete payload.salary
      if (editing) await DriversAPI.update(editing._id, payload)
      else await DriversAPI.create(payload)
      setModalOpen(false)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save driver.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!confirm(`Remove driver "${row.name}"? This cannot be undone.`)) return
    try {
      await DriversAPI.remove(row._id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not delete driver.')
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Driver master" title="Drivers" description="License, contact and salary records — plus real earnings (salary + advance paid) from completed trip sheets." />

      <div className="card overflow-hidden mb-4">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-steel-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value) }}
              placeholder="Search drivers by name or phone…"
              className="input-field pl-9"
            />
          </div>
          {isAdmin && (
            <button onClick={openCreate} className="btn-accent rounded px-3 py-2 text-sm flex items-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add driver
            </button>
          )}
        </div>
      </div>

      {loading && <LoadState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="No drivers logged yet" description="Add your first driver to start assigning trips and tracking license expiry." />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <button
                key={r._id}
                onClick={() => openPerformance(r)}
                className="card p-4 text-left flex flex-col gap-3 hover:shadow-md hover:border-accent/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base truncate">{r.name || 'Unnamed driver'}</p>
                    <p className="text-xs text-steel flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {r.phone || '—'}</p>
                  </div>
                  <Badge tone={r.status === 'active' ? 'positive' : 'steel'}>{r.status || 'unknown'}</Badge>
                </div>

                <div className="text-xs text-steel flex items-center gap-1">
                  <IdCard className="w-3.5 h-3.5" /> {r.licenseNumber || 'No license #'}
                </div>
                <LicenseRecommendation date={r.licenseExpiry} />

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={r.driverType === 'temporary' ? 'accent' : 'steel'}>{r.driverType || 'permanent'}</Badge>
                  <Badge tone="steel">{r.performance?.tripCount ?? 0} trip{(r.performance?.tripCount ?? 0) === 1 ? '' : 's'}</Badge>
                </div>

                <div className="mt-auto pt-2 border-t border-line flex items-center justify-between">
                  <div>
                    <p className="label-field">Earnings</p>
                    <Money value={r.performance?.totalEarning} />
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <span onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="p-1.5 text-steel hover:text-accent-deep rounded" role="button" aria-label="Edit driver">
                        <Pencil className="w-4 h-4" />
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded" role="button" aria-label="Delete driver">
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-4 text-sm text-steel">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-line disabled:opacity-40 hover:bg-paper-2"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-line disabled:opacity-40 hover:bg-paper-2"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      <TripPerformanceModal
        mode="driver"
        open={Boolean(performanceTarget)}
        onClose={() => { setPerformanceTarget(null); setPerformance(null); setPerformanceError(null) }}
        title={performanceTarget ? `Driver earnings — ${performanceTarget.name}` : 'Driver earnings'}
        subtitle={performanceTarget ? `${performanceTarget.phone || 'No phone'} · License ${performanceTarget.licenseNumber || '—'}` : ''}
        summary={performance?.summary}
        trips={performance?.trips}
        loading={performanceLoading}
        error={performanceError}
        partnerLabel="Vehicle"
        partnerValue={(trip) => trip.vehicleNoText || trip.vehicle?.vehicleNo || '—'}
        onEdit={isAdmin && performanceTarget ? () => openEdit(performanceTarget) : undefined}
        editLabel="Edit driver"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit driver' : 'Add driver'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name">
            <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
            <input required className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On leave</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4"><Field label="Driver type"><select className="input-field" value={form.driverType} onChange={e => setForm({ ...form, driverType: e.target.value })}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select></Field><Field label="Temporary until"><input required={form.driverType === 'temporary'} disabled={form.driverType !== 'temporary'} type="date" className="input-field disabled:opacity-50" value={form.temporaryUntil} onChange={e => setForm({ ...form, temporaryUntil: e.target.value })} /></Field></div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={<span className="inline-flex items-center gap-1.5">License number {editing && <MandatoryLockIcon locked={!mandatoryUnlocked} />}</span>}>
              <input required={!editing} disabled={Boolean(editing) && !mandatoryUnlocked} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            </Field>
            <Field label="License expiry">
              <input required type="date" className="input-field" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
            </Field>
          </div>
          {editing && isAdmin && !mandatoryUnlocked && (
            <button type="button" onClick={() => setMandatoryUnlocked(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-deep">
              <LockOpen className="w-3.5 h-3.5" /> Edit mandatory fields (Admin)
            </button>
          )}
          <Field label="Address">
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Monthly salary">
            <input type="number" step="0.01" className="input-field" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel hover:bg-paper-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function LicenseRecommendation({ date }) {
  if (!date) return <span className="text-steel-light">—</span>
  const days = Math.ceil((new Date(date) - new Date()) / 86400000)
  const tone = days <= 30 ? 'negative' : days <= 60 ? 'accent' : 'positive'
  const recommendation = days < 0 ? 'Renew immediately' : days <= 30 ? 'Renew now' : days <= 60 ? 'Renew soon' : 'Valid'
  return <div><span className="tabular text-xs">{String(date).slice(0, 10)}</span><Badge tone={tone}>{recommendation}</Badge></div>
}

function MandatoryLockIcon({ locked }) {
  return locked
    ? <Lock className="w-3 h-3 text-steel" title="Locked — admin only" />
    : <LockOpen className="w-3 h-3 text-accent-deep" title="Unlocked for editing" />
}
