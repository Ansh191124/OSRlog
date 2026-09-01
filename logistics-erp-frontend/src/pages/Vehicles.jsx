import { useEffect, useState, useCallback } from 'react'
import { VehiclesAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Modal, PageHeader, Badge, Field } from '../components/ui'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  vehicleNo: '', vehicleType: '', modelName: '', rcExpiry: '', insuranceExpiry: '',
  permitExpiry: '', fitnessExpiry: '', pucExpiry: '', status: 'active',
}

export default function Vehicles() {
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
  const [expiring, setExpiring] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, exp] = await Promise.all([
        VehiclesAPI.list({ search: search || undefined, page, limit: 10 }),
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

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({
      vehicleNo: row.vehicleNo || '', vehicleType: row.vehicleType || '', modelName: row.modelName || '',
      rcExpiry: sliceDate(row.rcExpiry), insuranceExpiry: sliceDate(row.insuranceExpiry),
      permitExpiry: sliceDate(row.permitExpiry), fitnessExpiry: sliceDate(row.fitnessExpiry),
      pucExpiry: sliceDate(row.pucExpiry), status: row.status || 'active',
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

  const columns = [
    { key: 'vehicleNo', header: 'Vehicle No.', render: (r) => <span className="font-mono font-semibold tabular">{r.vehicleNo || '—'}</span> },
    { key: 'vehicleType', header: 'Type' },
    { key: 'modelName', header: 'Model' },
    { key: 'insuranceExpiry', header: 'Insurance', render: (r) => <ExpiryCell date={r.insuranceExpiry} /> },
    { key: 'permitExpiry', header: 'Permit', render: (r) => <ExpiryCell date={r.permitExpiry} /> },
    { key: 'pucExpiry', header: 'PUC', render: (r) => <ExpiryCell date={r.pucExpiry} /> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'positive' : 'steel'}>{r.status || 'unknown'}</Badge> },
    ...(isAdmin ? [{
      key: 'actions', header: '', render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }] : []),
  ]

  return (
    <div>
      <PageHeader eyebrow="Vehicle master" title="Vehicles" description="RC, insurance, permit, fitness and PUC tracking across the fleet." />

      {expiring?.length > 0 && (
        <div className="card border-accent/30 bg-accent-soft/40 p-4 mb-6 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-accent-deep shrink-0 mt-0.5" />
          <div className="text-sm text-ink">
            <span className="font-semibold">{expiring.length} vehicle document{expiring.length > 1 ? 's' : ''} expiring within 30 days.</span>{' '}
            <span className="text-steel">{expiring.slice(0, 4).map((v) => v.vehicleNo).join(', ')}{expiring.length > 4 ? '…' : ''}</span>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        search={search}
        onSearch={(v) => { setPage(1); setSearch(v) }}
        searchPlaceholder="Search vehicles by number…"
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        onCreate={isAdmin ? openCreate : undefined}
        createLabel="Add vehicle"
        onRowClick={isAdmin ? openEdit : undefined}
        emptyTitle="No vehicles logged yet"
        emptyDescription="Add your first vehicle to start assigning it to trips."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit vehicle' : 'Add vehicle'} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Vehicle number">
              <input required className="input-field font-mono" value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Type">
              <select required className="input-field" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}><option value="">Select type</option><option>Truck</option><option>Trailer</option><option>Tipper</option><option>Tempo</option><option>Tyre carrier</option></select>
            </Field>
            <Field label="Model">
              <input required className="input-field" value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="RC expiry">
              <input type="date" className="input-field" value={form.rcExpiry} onChange={(e) => setForm({ ...form, rcExpiry: e.target.value })} />
            </Field>
            <Field label="Insurance expiry">
              <input type="date" className="input-field" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} />
            </Field>
            <Field label="Permit expiry">
              <input type="date" className="input-field" value={form.permitExpiry} onChange={(e) => setForm({ ...form, permitExpiry: e.target.value })} />
            </Field>
            <Field label="Fitness expiry">
              <input type="date" className="input-field" value={form.fitnessExpiry} onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })} />
            </Field>
            <Field label="PUC expiry">
              <input type="date" className="input-field" value={form.pucExpiry} onChange={(e) => setForm({ ...form, pucExpiry: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="in_service">In service</option>
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

function ExpiryCell({ date }) {
  if (!date) return <span className="text-steel-light">—</span>
  const days = Math.ceil((new Date(date) - new Date()) / 86400000)
  const tone = days < 0 ? 'negative' : days <= 30 ? 'accent' : 'positive'
  return (
    <div className="flex flex-col">
      <span className="tabular text-xs">{String(date).slice(0, 10)}</span>
      <Badge tone={tone}>{days < 0 ? 'expired' : `${days}d left`}</Badge>
    </div>
  )
}
