import { useEffect, useState, useCallback } from 'react'
import { PaymentsAPI, VehiclesAPI, SERVER_ROOT_URL } from '../lib/api'
import DataTable from '../components/DataTable'
import { Modal, PageHeader, Badge, Field, StatCard, Money } from '../components/ui'
import { Trash2, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { partyName: '', paymentType: 'cash', direction: 'received', category: 'freight', amount: '', date: '', vehicleId: '', notes: '' }

export default function Payments() {
  const { user } = useAuth()
  const isClient = user?.role === 'client'
  const canManageCashbook = user?.role === 'admin' || user?.role === 'accountant'
  const canVerify = user?.role === 'admin' || user?.role === 'accountant'
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [pendingFleetPayments, setPendingFleetPayments] = useState([])
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
      const calls = [
        PaymentsAPI.list({ paymentType: typeFilter || undefined }),
        PaymentsAPI.summary({}).catch(() => ({ data: { data: null } })),
      ]
      if (canVerify) calls.push(PaymentsAPI.list({ category: 'fleet_reservation', status: 'pending' }).catch(() => ({ data: { data: [] } })))
      const [res, sm, pend] = await Promise.all(calls)
      setRows(res.data?.data || res.data || [])
      setSummary(sm.data?.data || sm.data || null)
      if (pend) setPendingFleetPayments(pend.data?.data || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load payments from the API.')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, canVerify])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!canManageCashbook) return
    VehiclesAPI.list({ limit: 200 }).then((res) => {
      const data = res.data?.data || res.data || []
      setVehicles(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [canManageCashbook])

  const verify = async (payment, approve) => {
    if (!approve && !confirm('Reject this payment? The client will need to resubmit.')) return
    try {
      await PaymentsAPI.verify(payment._id, { approve })
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not update verification status.')
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (user?.role === 'client' && !editing && !receipt) return alert('A payment screenshot is required for client entries.')
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? undefined : Number(form.amount),
        remark: form.notes || undefined,
      }
      delete payload.notes
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
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'completed' ? 'positive' : r.status === 'pending' ? 'accent' : r.status === 'failed' ? 'negative' : 'default'}>{r.status || 'completed'}</Badge> },
    { key: 'vehicleNoText', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNo || r.vehicleNoText || '—' },
    { key: 'amount', header: 'Amount', render: (r) => <Money value={r.direction === 'paid' ? -Math.abs(r.amount || 0) : r.amount} /> },
    ...(canManageCashbook ? [{
      key: 'actions', header: '', render: (r) => (
        <button onClick={(e) => { e.stopPropagation(); remove(r) }} className="p-1.5 text-steel hover:text-negative rounded"><Trash2 className="w-4 h-4" /></button>
      )
    }] : []),
  ]

  return (
    <div>
      <PageHeader eyebrow={isClient ? 'Your payments' : 'Cash & online book'} title={isClient ? 'Your Fleet Payments' : 'Payment Book'} description={isClient ? 'Payments you\'ve submitted for your fleet reservations and their verification status.' : 'Every payment received or paid, linked to trips, vehicles and drivers.'} />

      {canVerify && pendingFleetPayments.length > 0 && (
        <div className="card p-5 mb-6 border-accent/30">
          <h2 className="font-display text-lg mb-1">Fleet payments awaiting verification</h2>
          <p className="text-sm text-steel mb-4">Clients have submitted these payments against their fleet reservations. Check the evidence, then verify or reject.</p>
          <div className="space-y-3">
            {pendingFleetPayments.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-4 border border-line rounded px-4 py-3 flex-wrap">
                <div>
                  <p className="font-medium">{p.fleet?.name || 'Fleet'} — {p.partyName}</p>
                  <p className="text-xs text-steel">
                    <Money value={p.amount} /> · {p.paymentType === 'online' ? 'Online' : 'Cash'}
                    {p.paymentType === 'cash' ? ` · paid to ${p.paidToName || '—'}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.paymentType === 'online' && p.receiptUrl && (
                    <a href={`${SERVER_ROOT_URL}${p.receiptUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-deep">
                      View screenshot <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => verify(p, true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-positive"><ShieldCheck className="w-4 h-4" /> Verify</button>
                  <button onClick={() => verify(p, false)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-negative"><ShieldX className="w-4 h-4" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        onCreate={isClient ? undefined : () => { setEditing(null); setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) }); setModalOpen(true) }}
        createLabel="Log payment"
        onRowClick={canManageCashbook ? openEdit : undefined}
        emptyTitle="No payments logged yet"
        emptyDescription={isClient ? "Submit a payment from the Fleets page against your reservation." : "Log a cash or online payment to start building the book."}
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
