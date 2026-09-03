import { useEffect, useState, useCallback } from 'react'
import { VehiclesAPI, UsersAPI, MaintenanceAPI } from '../lib/api'
import TripPerformanceModal from '../components/TripPerformanceModal'
import { Modal, PageHeader, Badge, Field, Money, LoadState, ErrorState, EmptyState } from '../components/ui'
import { Trash2, AlertTriangle, Lock, LockOpen, Pencil, Search, Plus, ChevronLeft, ChevronRight, Truck, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  vehicleNo: '', vehicleType: '', modelName: '', rcExpiry: '', insuranceExpiry: '',
  permitExpiry: '', fitnessExpiry: '', pucExpiry: '', status: 'active', remark: '', assignedEmployee: '',
}

export default function Vehicles() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManage = ['admin', 'co_admin'].includes(user?.role)
  const isEmployee = user?.role === 'employee'
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
  const [expiring, setExpiring] = useState([])
  const [mandatoryUnlocked, setMandatoryUnlocked] = useState(false)
  const [employees, setEmployees] = useState([])
  const [performanceTarget, setPerformanceTarget] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState(null)
  const [maintenance, setMaintenance] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, exp] = await Promise.all([
        VehiclesAPI.list({ search: search || undefined, page, limit: 10, includePerformance: true }),
        VehiclesAPI.expiringDocs(30).catch(() => ({ data: { data: [] } })),
      ])
      const data = res.data?.data || res.data || []
      setRows(Array.isArray(data) ? data : [])
      const pg = res.data?.pagination
      setTotalPages(pg ? Math.max(1, Math.ceil(pg.total / pg.limit)) : 1)
      setExpiring(exp.data?.data || exp.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load vehicles from the API.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  const openPerformance = async (row) => {
    setPerformanceTarget(row)
    setPerformance(null)
    setPerformanceError(null)
    setMaintenance([])
    setPerformanceLoading(true)
    try {
      const [perf, maint] = await Promise.all([
        VehiclesAPI.performance(row._id),
        MaintenanceAPI.list({ vehicleId: row._id, limit: 5 }).catch(() => ({ data: { data: [] } })),
      ])
      setPerformance(perf.data?.data || null)
      setMaintenance(maint.data?.data || [])
    } catch (err) {
      setPerformanceError(err?.response?.data?.message || 'Could not load vehicle earnings.')
    } finally {
      setPerformanceLoading(false)
    }
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setMandatoryUnlocked(false); setModalOpen(true) }
  const openEdit = (row) => {
    setPerformanceTarget(null)
    setEditing(row)
    setMandatoryUnlocked(false)
    if (canManage && !employees.length) UsersAPI.list({ role: 'employee' }).then((r) => setEmployees((r.data?.data || []).filter((u) => u.role === 'employee'))).catch(() => {})
    setForm({
      vehicleNo: row.vehicleNo || '', vehicleType: row.vehicleType || '', modelName: row.modelName || '',
      rcExpiry: sliceDate(row.rcExpiry), insuranceExpiry: sliceDate(row.insuranceExpiry),
      permitExpiry: sliceDate(row.permitExpiry), fitnessExpiry: sliceDate(row.fitnessExpiry),
      pucExpiry: sliceDate(row.pucExpiry), status: row.status || 'active', remark: row.remark || '',
      assignedEmployee: row.assignedEmployee?._id || row.assignedEmployee || '',
    })
    setModalOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await VehiclesAPI.update(editing._id, form)
      else await VehiclesAPI.create(form)
      setModalOpen(false)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save vehicle.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!confirm(`Remove vehicle "${row.vehicleNo}"? This cannot be undone.`)) return
    try {
      await VehiclesAPI.remove(row._id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not delete vehicle.')
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Vehicle master" title="Vehicles" description="RC, insurance, permit, fitness, PUC and maintenance tracking — plus total freight and P/L from trip sheets." />

      {expiring?.length > 0 && (
        <div className="card border-accent/30 bg-accent-soft/40 p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-accent-deep shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            <span className="font-semibold">{expiring.length} vehicle document{expiring.length > 1 ? 's' : ''} expiring within 30 days.</span>{' '}
            <span className="text-steel">{expiring.slice(0, 4).map((v) => v.vehicleNo).join(', ')}{expiring.length > 4 ? '…' : ''}</span>
          </div>
        </div>
      )}

      <div className="card overflow-hidden mb-4">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-steel-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value) }}
              placeholder="Search vehicles by number…"
              className="input-field pl-9"
            />
          </div>
          {canManage && (
            <button onClick={openCreate} className="btn-accent rounded px-3 py-2 text-sm flex items-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add vehicle
            </button>
          )}
        </div>
      </div>

      {loading && <LoadState />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="No vehicles logged yet" description="Add your first vehicle to start assigning it to trips." />
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
                    <p className="font-mono font-semibold text-base tabular truncate">{r.vehicleNo || '—'}</p>
                    <p className="text-xs text-steel flex items-center gap-1 mt-0.5"><Truck className="w-3 h-3" /> {r.vehicleType || 'Type not set'} {r.modelName ? `· ${r.modelName}` : ''}</p>
                  </div>
                  <Badge tone={r.status === 'active' ? 'positive' : 'steel'}>{r.status || 'unknown'}</Badge>
                </div>

                <div className="text-xs text-steel flex items-center gap-1">
                  <UserRound className="w-3.5 h-3.5" /> {r.assignedEmployee?.name || 'Unassigned'}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <ExpiryCell label="Insurance" date={r.insuranceExpiry} />
                  <ExpiryCell label="Permit" date={r.permitExpiry} />
                  <ExpiryCell label="PUC" date={r.pucExpiry} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="steel">{r.performance?.tripCount ?? 0} trip{(r.performance?.tripCount ?? 0) === 1 ? '' : 's'}</Badge>
                </div>

                <div className="mt-auto pt-2 border-t border-line flex items-center justify-between">
                  <div>
                    <p className="label-field">Total P/L</p>
                    <Money value={r.performance?.totalProfitLoss} />
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <span onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="p-1.5 text-steel hover:text-accent-deep rounded" role="button" aria-label="Edit vehicle">
                        <Pencil className="w-4 h-4" />
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded" role="button" aria-label="Delete vehicle">
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
        mode="vehicle"
        open={Boolean(performanceTarget)}
        onClose={() => { setPerformanceTarget(null); setPerformance(null); setPerformanceError(null); setMaintenance([]) }}
        title={performanceTarget ? `Vehicle earnings — ${performanceTarget.vehicleNo}` : 'Vehicle earnings'}
        subtitle={performanceTarget ? `${performanceTarget.vehicleType || 'Vehicle'} · ${performanceTarget.modelName || '—'} · Assigned to ${performanceTarget.assignedEmployee?.name || 'no one'}` : ''}
        summary={performance?.summary}
        trips={performance?.trips}
        loading={performanceLoading}
        error={performanceError}
        partnerLabel="Driver"
        partnerValue={(trip) => trip.driverNameText || trip.driver?.name || '—'}
        onEdit={(isAdmin || isEmployee) && performanceTarget ? () => openEdit(performanceTarget) : undefined}
        editLabel="Edit vehicle"
        maintenance={maintenance}
        vehicleDetails={performanceTarget ? {
          'RC expiry': fmtDate(performanceTarget.rcExpiry),
          'Insurance expiry': fmtDate(performanceTarget.insuranceExpiry),
          'Permit expiry': fmtDate(performanceTarget.permitExpiry),
          'Fitness expiry': fmtDate(performanceTarget.fitnessExpiry),
          'PUC expiry': fmtDate(performanceTarget.pucExpiry),
        } : null}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit vehicle' : 'Add vehicle'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label={<span className="inline-flex items-center gap-1.5">Vehicle number {editing && <MandatoryLockIcon locked={!mandatoryUnlocked} />}</span>}>
              <input required disabled={Boolean(editing) && !mandatoryUnlocked} className="input-field font-mono disabled:opacity-60 disabled:bg-paper-2" value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Type">
              <select required disabled={Boolean(editing) && !mandatoryUnlocked} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}><option value="">Select type</option><option>Truck</option><option>Trailer</option><option>Tipper</option><option>Tempo</option><option>Tyre carrier</option></select>
            </Field>
            <Field label="Model">
              <input required className="input-field" value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
            </Field>
          </div>
          {editing && isAdmin && !mandatoryUnlocked && (
            <button type="button" onClick={() => setMandatoryUnlocked(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-deep">
              <LockOpen className="w-3.5 h-3.5" /> Edit mandatory fields (Admin)
            </button>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="RC expiry">
              <input type="date" disabled={isEmployee} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.rcExpiry} onChange={(e) => setForm({ ...form, rcExpiry: e.target.value })} />
            </Field>
            <Field label="Insurance expiry">
              <input type="date" disabled={isEmployee} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
            </Field>
            <Field label="Permit expiry">
              <input type="date" disabled={isEmployee} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.permitExpiry} onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })} />
            </Field>
            <Field label="Fitness expiry">
              <input type="date" disabled={isEmployee} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} />
            </Field>
            <Field label="PUC expiry">
              <input type="date" disabled={isEmployee} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.pucExpiry} onChange={(e) => setForm({ ...form, pucExpiry: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="in_maintenance">In maintenance</option>
                <option value="sold">Sold</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Remark">
              <input className="input-field" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="Condition notes, issues, etc." />
            </Field>
            <Field label="Assigned employee">
              <select disabled={!canManage} className="input-field disabled:opacity-60 disabled:bg-paper-2" value={form.assignedEmployee} onChange={(e) => setForm({ ...form, assignedEmployee: e.target.value })}>
                <option value="">Unassigned</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                {form.assignedEmployee && !employees.find((e) => e._id === form.assignedEmployee) && editing?.assignedEmployee?.name && (
                  <option value={form.assignedEmployee}>{editing.assignedEmployee.name}</option>
                )}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel hover:bg-paper-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function sliceDate(d) { return d ? String(d).slice(0, 10) : '' }
function fmtDate(d) { return d ? String(d).slice(0, 10) : '—' }

function MandatoryLockIcon({ locked }) {
  return locked
    ? <Lock className="w-3 h-3 text-steel" title="Locked — admin only" />
    : <LockOpen className="w-3 h-3 text-accent-deep" title="Unlocked for editing" />
}

function ExpiryCell({ label, date }) {
  if (!date) return (
    <div className="flex flex-col">
      <span className="label-field">{label}</span>
      <span className="text-steel-light text-xs">—</span>
    </div>
  )
  const days = Math.ceil((new Date(date) - new Date()) / 86400000)
  const tone = days < 0 ? 'negative' : days <= 30 ? 'accent' : 'positive'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-field">{label}</span>
      <Badge tone={tone}>{days < 0 ? 'expired' : `${days}d left`}</Badge>
    </div>
  )
}
