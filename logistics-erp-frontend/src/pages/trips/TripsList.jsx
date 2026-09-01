import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TripsAPI, VehiclesAPI } from '../../lib/api'
import DataTable from '../../components/DataTable'
import { Modal, PageHeader, Badge, Field } from '../../components/ui'

const EMPTY = { vehicleNoText: '', driverNameText: '', startDate: '', endDate: '', timeIn: '', timeOut: '', remark: '' }

export default function TripsList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [vehicleOptions, setVehicleOptions] = useState([])

  useEffect(() => {
    VehiclesAPI.list({ limit: 200 }).then((res) => {
      const data = res.data?.data || res.data || []
      setVehicleOptions(Array.isArray(data) ? data.map((v) => v.vehicleNo).filter(Boolean) : [])
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await TripsAPI.list({ search: search || undefined, page, limit: 10 })
      const data = res.data?.data || res.data || []
      setRows(Array.isArray(data) ? data : [])
      const pg = res.data?.pagination
      setTotalPages(pg ? Math.max(1, Math.ceil(pg.total / pg.limit)) : 1)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load trip sheets from the API.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await TripsAPI.create(form)
      const trip = res.data?.data || res.data
      setModalOpen(false)
      navigate(`/trips/${trip._id}`)
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not create trip sheet.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'vehicleNoText', header: 'Vehicle', render: (r) => <span className="font-mono font-semibold tabular">{r.vehicleNoText || r.vehicleId?.vehicleNo || '—'}</span> },
    { key: 'driverNameText', header: 'Driver', render: (r) => r.driverNameText || r.driverId?.name || '—' },
    { key: 'startDate', header: 'Start', render: (r) => sliceDate(r.startDate) },
    { key: 'endDate', header: 'End', render: (r) => sliceDate(r.endDate) },
    { key: 'freightTotal', header: 'Freight', render: (r) => r.summary?.freightTotal !== undefined ? <span className="tabular">₹{Number(r.summary.freightTotal).toLocaleString('en-IN')}</span> : '—' },
    {
      key: 'profitLoss', header: 'P/L', render: (r) => {
        const v = r.summary?.profitLoss
        if (v === undefined || v === null) return '—'
        return <Badge tone={Number(v) < 0 ? 'negative' : 'positive'}>₹{Number(v).toLocaleString('en-IN')}</Badge>
      }
    },
  ]

  return (
    <div>
      <PageHeader eyebrow="Digital trip sheet" title="Trip Sheets" description="Every leg, expense line and summary figure from the paper register, one sheet per trip." />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        search={search}
        onSearch={(v) => { setPage(1); setSearch(v) }}
        searchPlaceholder="Search by vehicle, driver, party…"
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        onCreate={() => { setForm(EMPTY); setModalOpen(true) }}
        createLabel="New trip sheet"
        onRowClick={(r) => navigate(`/trips/${r._id}`)}
        emptyTitle="No trip sheets logged yet"
        emptyDescription="Start a new trip sheet to log legs, expenses and the profit/loss summary."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New trip sheet">
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle number">
              <input list="trip-vehicle-options" required className="input-field font-mono" value={form.vehicleNoText} onChange={(e) => setForm({ ...form, vehicleNoText: e.target.value.toUpperCase() })} placeholder="Select or type…" />
              <datalist id="trip-vehicle-options">
                {vehicleOptions.map((v) => <option key={v} value={v} />)}
              </datalist>
            </Field>
            <Field label="Driver name">
              <input required className="input-field" value={form.driverNameText} onChange={(e) => setForm({ ...form, driverNameText: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date">
              <input required type="date" className="input-field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="End date">
              <input type="date" className="input-field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Time in">
              <input className="input-field" placeholder="7:48 PM" value={form.timeIn} onChange={(e) => setForm({ ...form, timeIn: e.target.value })} />
            </Field>
            <Field label="Time out">
              <input className="input-field" placeholder="8:52 PM" value={form.timeOut} onChange={(e) => setForm({ ...form, timeOut: e.target.value })} />
            </Field>
          </div>
          <Field label="Remark">
            <input className="input-field" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel hover:bg-paper-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">
              {saving ? 'Creating…' : 'Create & open sheet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function sliceDate(d) { return d ? String(d).slice(0, 10) : '—' }
