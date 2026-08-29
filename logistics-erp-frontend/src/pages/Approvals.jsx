import { useCallback, useEffect, useState } from 'react'
import { ApprovalsAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Badge, Field, Modal, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const EMPTY = { requestType: 'driver_payment', title: '', amount: '', paymentType: 'cash', paymentMode: 'cash', details: '' }
const TONE = { requested: 'accent', approved: 'steel', paid: 'positive', rejected: 'negative' }

export default function Approvals() {
  const { user } = useAuth(); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null)
  const [open, setOpen] = useState(false); const [form, setForm] = useState(EMPTY); const [saving, setSaving] = useState(false)
  const canApprove = ['admin', 'co_admin'].includes(user?.role); const canPay = ['admin', 'accountant'].includes(user?.role)
  const load = useCallback(async () => { setLoading(true); try { setError(null); const r = await ApprovalsAPI.list(); setRows(r.data?.data || []) } catch (e) { setError(e?.response?.data?.message || 'Could not load approval requests.') } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await ApprovalsAPI.create({ ...form, amount: Number(form.amount) }); setOpen(false); setForm(EMPTY); load() } catch (err) { alert(err?.response?.data?.message || 'Could not send request.') } finally { setSaving(false) } }
  const action = async (row, type) => { try { if (type === 'reject') { const reason = prompt('Reason for rejection:'); if (reason === null) return; await ApprovalsAPI.reject(row._id, reason) } else if (type === 'approve') await ApprovalsAPI.approve(row._id); else await ApprovalsAPI.pay(row._id); load() } catch (err) { alert(err?.response?.data?.message || 'Could not update request.') } }
  const columns = [
    { key: 'requestType', header: 'Type', render: r => <span className="capitalize">{r.requestType.replace('_', ' ')}</span> },
    { key: 'title', header: 'Request', render: r => <span className="font-medium">{r.title}</span> },
    { key: 'amount', header: 'Amount', render: r => `₹${Number(r.amount).toLocaleString('en-IN')}` },
    { key: 'requestedBy', header: 'Requested by', render: r => r.requestedBy?.name || '—' },
    { key: 'status', header: 'Status', render: r => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
    { key: 'actions', header: '', render: r => <div className="flex gap-2">{r.status === 'requested' && canApprove && <><button onClick={e => { e.stopPropagation(); action(r, 'approve') }} className="text-xs text-positive font-semibold">Approve</button><button onClick={e => { e.stopPropagation(); action(r, 'reject') }} className="text-xs text-negative font-semibold">Reject</button></>}{r.status === 'approved' && canPay && <button onClick={e => { e.stopPropagation(); action(r, 'pay') }} className="text-xs text-positive font-semibold">Mark paid</button>}</div> },
  ]
  return <div><PageHeader eyebrow="Controlled spending" title="Approval queue" description="Driver advances, maintenance costs and stock purchases follow Request → Approval → Accountant payment." action={<button onClick={() => setOpen(true)} className="btn-accent px-3 py-2 rounded text-sm">New request</button>} />
    <DataTable columns={columns} rows={rows} loading={loading} error={error} emptyTitle="No approval requests" emptyDescription="Send a payment request to begin the approval workflow." />
    <Modal open={open} onClose={() => setOpen(false)} title="Request payment"><form onSubmit={submit} className="space-y-4"><Field label="Request type"><select className="input-field" value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value })}><option value="driver_payment">Driver payment / advance</option><option value="maintenance">Maintenance</option><option value="inventory_purchase">Inventory purchase</option></select></Field><Field label="Title"><input required className="input-field" placeholder="e.g. Advance for Rajesh" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field><div className="grid grid-cols-2 gap-4"><Field label="Amount"><input required min="0" type="number" className="input-field" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Paid via"><select className="input-field" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })}><option value="cash">Cash</option><option value="online">Online</option></select></Field></div><Field label="Details"><textarea className="input-field" rows="3" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} /></Field><div className="flex justify-end gap-2"><button type="button" className="px-4 py-2 border border-line rounded" onClick={() => setOpen(false)}>Cancel</button><button disabled={saving} className="btn-accent px-4 py-2 rounded">{saving ? 'Sending…' : 'Send request'}</button></div></form></Modal>
  </div>
}
