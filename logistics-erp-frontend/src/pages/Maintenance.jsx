import { useEffect, useState, useCallback } from 'react'
import { InventoryAPI, MaintenanceAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Modal, PageHeader, Badge, Field } from '../components/ui'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { vehicleNoText: '', serviceType: '', priority: 'medium', status: 'pending', dueDate: '', odometerDue: '', cost: '', notes: '', inventoryItemId: '', inventoryQuantity: '' }

const STATUS_TONE = { pending: 'accent', upcoming: 'steel', ongoing: 'accent', completed: 'positive' }

export default function Maintenance() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [rows, setRows] = useState([])
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [inventoryItems, setInventoryItems] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, al] = await Promise.all([
        MaintenanceAPI.list({ status: statusFilter || undefined }),
        MaintenanceAPI.alerts(15).catch(() => ({ data: { data: null } })),
      ])
      setRows(res.data?.data || res.data || [])
      setAlerts(al.data?.data || al.data || null)
      const inventory = await InventoryAPI.list().catch(() => ({ data: { data: [] } }))
      setInventoryItems(inventory.data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load maintenance records from the API.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({
      vehicleNoText: row.vehicleNoText || row.vehicle?.vehicleNo || '', serviceType: row.maintenanceType || row.serviceType || '',
      priority: row.priority || 'medium', status: row.status || 'pending',
      dueDate: row.scheduledDate ? row.scheduledDate.slice(0, 10) : '', odometerDue: row.nextDueOdometer ?? '', cost: row.cost ?? '', notes: row.remark || '', inventoryItemId: '', inventoryQuantity: '',
    })
    setModalOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { inventoryItemId, inventoryQuantity, ...details } = form
      const payload = {
        ...details,
        odometerDue: form.odometerDue === '' ? undefined : Number(form.odometerDue),
        cost: form.cost === '' ? 0 : Number(form.cost),
        ...(inventoryItemId ? { inventoryUses: [{ itemId: inventoryItemId, quantity: Number(inventoryQuantity || 1) }] } : {}),
      }
      if (editing) await MaintenanceAPI.update(editing._id, payload)
      else await MaintenanceAPI.create(payload)
      setModalOpen(false)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save maintenance record.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row) => {
    if (!confirm('Delete this maintenance record?')) return
    try { await MaintenanceAPI.remove(row._id); load() } catch (err) { alert(err?.response?.data?.message || 'Could not delete record.') }
  }

  const columns = [
    { key: 'vehicleNoText', header: 'Vehicle', render: (r) => <span className="font-mono font-semibold tabular">{r.vehicleNoText || r.vehicle?.vehicleNo || '—'}</span> },
    { key: 'maintenanceType', header: 'Service' },
    { key: 'inventoryCost', header: 'Stock used', render: (r) => r.inventoryCost ? `₹${Number(r.inventoryCost).toLocaleString('en-IN')}` : '-' },
    { key: 'scheduledDate', header: 'Due', render: (r) => r.scheduledDate ? r.scheduledDate.slice(0, 10) : '—' },
    { key: 'priority', header: 'Priority', render: (r) => <Badge tone={r.priority === 'high' ? 'negative' : r.priority === 'low' ? 'steel' : 'accent'}>{r.priority || 'normal'}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'steel'}>{r.status || 'pending'}</Badge> },
    ...(isAdmin ? [{
      key: 'actions', header: '', render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded"><Trash2 className="w-4 h-4" /></button>
      )
    }] : []),
  ]

  return (
    <div>
      <PageHeader eyebrow="Service board" title="Maintenance" description="Pending, upcoming, ongoing and completed servicing with due-date alerts." />

      {alerts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {['pending', 'upcoming', 'ongoing', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`card p-4 text-left transition-colors ${statusFilter === s ? 'border-accent ring-1 ring-accent' : 'hover:border-steel-light'}`}
            >
              <span className="label-field">{s}</span>
              <span className="font-mono text-2xl font-semibold tabular">{alerts[s]?.length ?? alerts[`${s}Count`] ?? '—'}</span>
            </button>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onCreate={openCreate}
        createLabel="Add record"
        onRowClick={openEdit}
        emptyTitle="No maintenance records yet"
        emptyDescription="Log servicing for a vehicle to start tracking due dates and odometer alerts."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit maintenance record' : 'Add maintenance record'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vehicle number">
              <input required className="input-field font-mono" value={form.vehicleNoText} onChange={(e) => setForm({ ...form, vehicleNoText: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Service type">
              <select required className="input-field" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value, inventoryItemId: '', inventoryQuantity: '' })}>
                <option value="">Select service</option><option value="tyre">Tyre replacement</option><option value="urea">Urea refill</option><option value="diesel">Diesel refill</option><option value="custom">Other service</option>
              </select>
            </Field>
          </div>
          {!editing && ['tyre', 'urea', 'diesel'].includes(form.serviceType) && (
            <div className="rounded border border-accent/20 bg-accent-soft/30 p-3 space-y-3">
              <p className="text-sm font-medium text-ink">Use stock from inventory</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Available inventory"><select className="input-field" value={form.inventoryItemId} onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}><option value="">Do not use inventory</option>{inventoryItems.filter((item) => item.status === 'available' && item.category === form.serviceType && Number(item.quantity) > 0).map((item) => <option key={item._id} value={item._id}>{item.name} — {item.quantity} {item.unit} available</option>)}</select></Field>
                <Field label="Quantity used"><input disabled={!form.inventoryItemId} min="0.01" step="0.01" type="number" className="input-field disabled:opacity-50" value={form.inventoryQuantity} onChange={(e) => setForm({ ...form, inventoryQuantity: e.target.value })} /></Field>
              </div>
              <p className="text-xs text-steel">Saving this maintenance record deducts the selected quantity from Inventory and adds its cost to this record.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Priority">
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option><option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option><option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Odometer due (km)">
            <input type="number" className="input-field" value={form.odometerDue} onChange={(e) => setForm({ ...form, odometerDue: e.target.value })} />
          </Field>
          <Field label="External service cost (₹)">
            <input min="0" step="0.01" type="number" className="input-field" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
          <Field label="Notes">
            <textarea rows={3} className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded border border-line text-steel hover:bg-paper-2">Cancel</button>
            <button type="submit" disabled={saving} className="btn-accent px-4 py-2 text-sm rounded disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
