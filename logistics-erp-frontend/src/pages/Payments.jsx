import { useEffect, useState, useCallback } from 'react'
import { PaymentsAPI, VehiclesAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Modal, PageHeader, Badge, Field, StatCard, Money } from '../components/ui'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { partyName: '', paymentType: 'cash', direction: 'received', category: 'freight', amount: '', date: '', vehicleId: '', notes: '' }

export default function Payments() {
  const { user } = useAuth()
  const canManageCashbook = user?.role === 'admin' || user?.role === 'accountant'
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [receipt, setReceipt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, sm] = await Promise.all([
        PaymentsAPI.list({ paymentType: typeFilter || undefined }),
        PaymentsAPI.summary({}).catch(() => ({ data: { data: null } })),
      ])
      setRows(res.data?.data || res.data || [])
      setSummary(sm.data?.data || sm.data || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load payments from the API.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { VehiclesAPI.list({ limit: 100 }).then(r => setVehicles(r.data?.data || [])).catch(() => {}) }, [])

  const save = async (e) => {
    e.preventDefault()
    if (user?.role === 'client' && !editing && !receipt) return alert('A payment screenshot is required for client entries.')
    setSaving(true)
    try {
      const payload = { ...form, amount: form.amount === '' ? undefined : Number(form.amount) }
      if (editing) await PaymentsAPI.update(editing._id, payload)
      else {
        const created = await PaymentsAPI.create(payload)
        if (receipt) {
          const data = new FormData(); data.append('file', receipt)
          await PaymentsAPI.uploadReceipt((created.data?.data || created.data)._id, data)
        }
      }
      setModalOpen(false)
      setEditing(null)
      setForm(EMPTY)
      setReceipt(null)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save payment.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      partyName: row.partyName || '', paymentType: row.paymentType || 'cash', direction: row.direction || 'received', category: row.category || 'freight',
      amount: row.amount ?? '', date: row.date ? String(row.date).slice(0, 10) : '', vehicleId: row.vehicle?._id || '', notes: row.remark || '',
    })
    setModalOpen(true)
  }

  const remove = async (row) => {
    if (!confirm('Delete this payment entry?')) return
    try { await PaymentsAPI.remove(row._id); load() } catch (err) { alert(err?.response?.data?.message || 'Could not delete payment.') }
  }

  const columns = [
    { key: 'date', header: 'Date', render: (r) => r.date ? r.date.slice(0, 10) : '—' },
    { key: 'paymentType', header: 'Type', render: (r) => <Badge tone={r.paymentType === 'cash' ? 'accent' : 'steel'}>{r.paymentType}</Badge> },
    { key: 'direction', header: 'Direction', render: (r) => <Badge tone={r.direction === 'received' ? 'positive' : 'negative'}>{r.direction}</Badge> },
    { key: 'category', header: 'Category' },
    { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNo || '—' },
    { key: 'amount', header: 'Amount', render: (r) => <Money value={r.direction === 'paid' ? -Math.abs(r.amount || 0) : r.amount} /> },
    ...(canManageCashbook ? [{
      key: 'actions', header: '', render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded"><Trash2 className="w-4 h-4" /></button>
      )
    }] : []),
  ]

  return (
    <div>
      <PageHeader eyebrow="Cash & online book" title="Payment Book" description="Every payment received or paid, linked to trips, vehicles and drivers." />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Cash received" value={fmt(summary.cash?.received)} tone="positive" />
          <StatCard label="Cash paid" value={fmt(summary.cash?.paid)} tone="negative" />
          <StatCard label="Online received" value={fmt(summary.online?.received)} tone="positive" />
          <StatCard label="Online paid" value={fmt(summary.online?.paid)} tone="negative" />
        </div>
      )}

      <div className="flex gap-1 bg-white border border-line rounded p-1 w-fit mb-4">
        {['', 'cash', 'online'].map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors ${typeFilter === t ? 'bg-accent text-white' : 'text-steel hover:text-ink'}`}
          >
            {t || 'all'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onCreate={() => { setEditing(null); setForm(EMPTY); setReceipt(null); setModalOpen(true) }}
        createLabel="Log payment"
        onRowClick={canManageCashbook ? openEdit : undefined}
        emptyTitle="No payments logged yet"
        emptyDescription="Log a cash or online payment to start building the book."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit cashbook entry' : 'Log payment'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Party name"><input required className="input-field" value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className="input-field" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
                <option value="cash">Cash</option><option value="online">Online</option>
              </select>
            </Field>
            <Field label="Direction">
              <select className="input-field" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="received">Received</option><option value="paid">Paid</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <input required min="0.01" type="number" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Date">
              <input required type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Category">
            <select required className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="freight">Freight</option><option value="advance">Advance</option><option value="expense">Expense</option><option value="salary">Salary</option><option value="maintenance">Maintenance</option><option value="fuel">Fuel</option><option value="other">Other</option></select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle number"><select className="input-field" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">No vehicle</option>{vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNo}</option>)}</select></Field>
            <Field label="Payment mode"><select className="input-field" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}><option value="cash">Cash</option><option value="online">Online</option></select></Field>
          </div>
          <Field label="Notes">
            <textarea rows={2} className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {user?.role === 'client' && !editing && <Field label="Payment screenshot"><input required type="file" accept="image/*,.pdf" className="input-field" onChange={(e) => setReceipt(e.target.files?.[0] || null)} /></Field>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel hover:bg-paper-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Log payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function fmt(v) { return v === undefined || v === null ? '—' : Number(v).toLocaleString('en-IN') }
