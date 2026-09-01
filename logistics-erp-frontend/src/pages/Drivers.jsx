import { useEffect, useState, useCallback } from 'react'
import { DriversAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Modal, PageHeader, Badge, Field } from '../components/ui'
import { Trash2 } from 'lucide-react'
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await DriversAPI.list({ search: search || undefined, page, limit: 10 })
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

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
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

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name || '—'}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'licenseNumber', header: 'License #' },
    { key: 'licenseExpiry', header: 'License Expiry', render: (r) => <LicenseRecommendation date={r.licenseExpiry} /> },
    { key: 'driverType', header: 'Type', render: (r) => <Badge tone={r.driverType === 'temporary' ? 'accent' : 'steel'}>{r.driverType || 'permanent'}</Badge> },
    { key: 'salaryAmount', header: 'Salary', render: (r) => r.salaryAmount !== undefined && r.salaryAmount !== null ? <span className="tabular">₹{Number(r.salaryAmount).toLocaleString('en-IN')}</span> : '—' },
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
      <PageHeader eyebrow="Driver master" title="Drivers" description="License, contact and salary records for every driver on the roster." />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        search={search}
        onSearch={(v) => { setPage(1); setSearch(v) }}
        searchPlaceholder="Search drivers by name or phone…"
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        onCreate={isAdmin ? openCreate : undefined}
        createLabel="Add driver"
        onRowClick={isAdmin ? openEdit : undefined}
        emptyTitle="No drivers logged yet"
        emptyDescription="Add your first driver to start assigning trips and tracking license expiry."
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
          <div className="grid grid-cols-2 gap-4"><Field label="Driver type"><select className="input-field" value={form.driverType} onChange={e => setForm({ ...form, driverType: e.target.value })}><option value="permanent">Permanent</option><option value="temporary">Temporary</option></select></Field><Field label="Temporary until"><input disabled={form.driverType !== 'temporary'} type="date" className="input-field disabled:opacity-50" value={form.temporaryUntil} onChange={e => setForm({ ...form, temporaryUntil: e.target.value })} /></Field></div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="License number">
              <input required className="input-field" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            </Field>
            <Field label="License expiry">
              <input required type="date" className="input-field" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
            </Field>
          </div>
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
