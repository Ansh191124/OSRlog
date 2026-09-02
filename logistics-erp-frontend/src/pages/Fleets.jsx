import { useCallback, useEffect, useState } from 'react'
import { FleetsAPI, UsersAPI, VehiclesAPI, OrgSettingsAPI, PaymentsAPI } from '../lib/api'
import DataTable from '../components/DataTable'
import { Badge, Field, Modal, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { Settings } from 'lucide-react'

const EMPTY = { name: '', clientName: '', contactName: '', contactPhone: '', fleetCodeFrom: '', fleetCodeTo: '', reservedVehicleCount: '', reservationStartDate: '', reservationEndDate: '' }
const PAYMENT_EMPTY = { amount: '', paymentType: 'online', paidToName: '' }

export default function Fleets() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [assign, setAssign] = useState(null)
  const [users, setUsers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [assignment, setAssignment] = useState({ assignedPersonId: '', vehicleIds: [] })
  const [formError, setFormError] = useState('')
  const [pool, setPool] = useState(null)
  const [poolOpen, setPoolOpen] = useState(false)
  const [poolForm, setPoolForm] = useState({ fleetPrefix: '', fleetRangeStart: '', fleetRangeEnd: '' })
  const [poolError, setPoolError] = useState('')
  const [myPayments, setMyPayments] = useState([])
  const [payFleet, setPayFleet] = useState(null)
  const [paymentForm, setPaymentForm] = useState(PAYMENT_EMPTY)
  const [paymentFile, setPaymentFile] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)

  const isAdmin = user?.role === 'admin'
  const canManage = ['admin', 'co_admin'].includes(user?.role)
  const canAssign = ['admin', 'co_admin', 'employee'].includes(user?.role)
  const isClient = user?.role === 'client'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const r = await FleetsAPI.list()
      setRows(r.data?.data || [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load fleets.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { OrgSettingsAPI.fleetPool().then((r) => setPool(r.data?.data)).catch(() => {}) }, [rows.length])
  useEffect(() => {
    if (!isClient) return
    PaymentsAPI.list({ category: 'fleet_reservation' }).then((r) => setMyPayments(r.data?.data || [])).catch(() => {})
  }, [isClient, rows.length])

  const paymentForFleet = (fleetId) => myPayments.filter((p) => String(p.fleet?._id || p.fleet) === String(fleetId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

  const openCreate = () => { setForm(isClient ? clientFormDefaults(user) : EMPTY); setFormError(''); setOpen(true) }

  const save = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      const payload = isClient
        ? {
            reservedVehicleCount: form.reservedVehicleCount,
            reservationStartDate: form.reservationStartDate || undefined,
            reservationEndDate: form.reservationEndDate || undefined,
            notes: form.notes || undefined,
          }
        : form
      const res = await FleetsAPI.create(payload)
      setOpen(false); setForm(EMPTY); load()
      if (isClient && res.data?.data?._id) openPayment(res.data.data)
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Could not create fleet.')
    }
  }

  const openPayment = (fleet) => { setPayFleet(fleet); setPaymentForm(PAYMENT_EMPTY); setPaymentFile(null); setPaymentError('') }
  const savePayment = async (e) => {
    e.preventDefault()
    setPaymentError('')
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { setPaymentError('Enter a valid amount.'); return }
    if (paymentForm.paymentType === 'cash' && !paymentForm.paidToName.trim()) { setPaymentError('Enter who you paid the cash to.'); return }
    if (paymentForm.paymentType === 'online' && !paymentFile) { setPaymentError('Attach a screenshot of the payment.'); return }
    setPaymentSaving(true)
    try {
      const res = await PaymentsAPI.create({
        fleetId: payFleet._id,
        amount: Number(paymentForm.amount),
        paymentType: paymentForm.paymentType,
        paidToName: paymentForm.paymentType === 'cash' ? paymentForm.paidToName : undefined,
      })
      const payment = res.data?.data
      if (paymentForm.paymentType === 'online' && paymentFile && payment?._id) {
        const fd = new FormData(); fd.append('file', paymentFile)
        await PaymentsAPI.uploadReceipt(payment._id, fd)
      }
      setPayFleet(null)
      const refreshed = await PaymentsAPI.list({ category: 'fleet_reservation' })
      setMyPayments(refreshed.data?.data || [])
    } catch (err) {
      setPaymentError(err?.response?.data?.message || 'Could not submit payment.')
    } finally {
      setPaymentSaving(false)
    }
  }

  const openAssign = async (row) => {
    setAssign(row)
    setAssignment({ assignedPersonId: row.assignedPerson?._id || '', vehicleIds: (row.vehicles || []).map((v) => v._id) })
    try {
      const [u, v] = await Promise.all([UsersAPI.list(), VehiclesAPI.list({ limit: 100 })])
      setUsers(u.data?.data || [])
      setVehicles(v.data?.data || [])
    } catch {
      alert('Could not load assignment options.')
    }
  }
  const saveAssignment = async (e) => {
    e.preventDefault()
    try {
      await FleetsAPI.assign(assign._id, assignment)
      setAssign(null); load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not assign fleet.')
    }
  }

  const openPool = () => { setPoolForm({ fleetPrefix: pool?.fleetPrefix || 'FL', fleetRangeStart: pool?.fleetRangeStart || '', fleetRangeEnd: pool?.fleetRangeEnd || '' }); setPoolError(''); setPoolOpen(true) }
  const savePool = async (e) => {
    e.preventDefault()
    setPoolError('')
    try {
      const r = await OrgSettingsAPI.updateFleetPool(poolForm)
      setPool((prev) => ({ ...prev, ...r.data?.data }))
      setPoolOpen(false)
    } catch (err) {
      setPoolError(err?.response?.data?.message || 'Could not update the fleet pool.')
    }
  }

  const statusBadge = (r) => {
    if (r.status === 'active') return <Badge tone="positive">Running</Badge>
    if (r.reservationStatus === 'reserved') return <Badge tone="default">Awaiting approval</Badge>
    if (r.reservationStatus === 'approved') return <Badge tone="accent">Approved · unassigned</Badge>
    return <Badge tone="accent">{r.status.replace('_', ' ')}</Badge>
  }

  const paymentBadge = (p) => {
    if (!p) return <Badge tone="default">Not submitted</Badge>
    if (p.status === 'pending') return <Badge tone="accent">Pending verification</Badge>
    if (p.status === 'completed') return <Badge tone="positive">Verified</Badge>
    return <Badge tone="negative">Rejected</Badge>
  }

  return (
    <div>
      <PageHeader
        eyebrow="Fleet booking system"
        title="Fleets"
        description={isClient ? "Reserve a block of vehicles for your fleet — an admin approves it, then a team member assigns the vehicles." : "Reserve or create client fleets, then approve and assign vehicles from the shared serial pool."}
        action={
          <div className="flex gap-2">
            {isAdmin && pool && (
              <button onClick={openPool} className="inline-flex items-center gap-1.5 border border-line px-3 py-2 rounded text-sm text-steel hover:text-ink">
                <Settings className="w-3.5 h-3.5" /> Fleet pool ({pool.remainingSlots}/{pool.totalSlots} free)
              </button>
            )}
            {(canManage || isClient) && (
              <button onClick={openCreate} className="btn-accent px-3 py-2 rounded text-sm">{isClient ? 'Reserve fleet' : 'Create fleet'}</button>
            )}
          </div>
        }
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Fleet', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'clientName', header: 'Client' },
          { key: 'range', header: 'Reserved range', render: (r) => r.fleetCodeFrom && r.fleetCodeTo ? <span className="font-mono text-xs">{r.fleetCodeFrom} – {r.fleetCodeTo}</span> : '—' },
          { key: 'period', header: 'Reserved period', render: (r) => r.reservationStartDate && r.reservationEndDate ? <span className="text-xs">{String(r.reservationStartDate).slice(0, 10)} → {String(r.reservationEndDate).slice(0, 10)}</span> : '—' },
          { key: 'assignedPerson', header: 'Responsible person', render: (r) => r.assignedPerson?.name || 'Unassigned' },
          { key: 'vehicles', header: 'Vehicles', render: (r) => r.vehicles?.map((v) => v.vehicleNo).join(', ') || 'None' },
          { key: 'status', header: 'Status', render: statusBadge },
          ...(isClient ? [{
            key: 'payment', header: 'Payment', render: (r) => {
              const p = paymentForFleet(r._id)
              return (
                <div className="flex items-center gap-2">
                  {paymentBadge(p)}
                  {(!p || p.status === 'failed') && <button onClick={(e) => { e.stopPropagation(); openPayment(r) }} className="text-xs font-semibold text-accent-deep">Pay</button>}
                </div>
              )
            }
          }] : []),
          ...(canAssign ? [{ key: 'actions', header: '', render: (r) => r.reservationStatus !== 'reserved' && <button onClick={(e) => { e.stopPropagation(); openAssign(r) }} className="text-xs font-semibold text-accent-deep">Assign</button> }] : []),
        ]}
        rows={rows}
        loading={loading}
        error={error}
        emptyTitle="No fleets created"
        emptyDescription={isClient ? "Reserve your first fleet to get started." : "Create a client fleet, then assign its person and vehicles."}
      />

      <Modal open={open} onClose={() => { setOpen(false); setFormError('') }} title={isClient ? 'Reserve fleet for future use' : 'Create client fleet'}>
        <form onSubmit={save} className="space-y-4">
          {formError && <div className="text-sm text-negative bg-negative-soft border border-negative/20 rounded px-3 py-2">{formError}</div>}

          {isClient ? (
            <>
              <div className="rounded border border-line bg-paper-2/60 px-4 py-3 text-sm">
                <p className="font-medium text-ink">Booking as</p>
                <p className="text-steel mt-1">{user?.name || '—'}</p>
                <p className="text-steel">{user?.email || '—'}</p>
                {user?.phone && <p className="text-steel">{user.phone}</p>}
                <p className="text-xs text-steel mt-2">Your name and contact details are taken from your account automatically.</p>
              </div>
              <Field label="How many vehicles do you need?">
                <input required type="number" min="1" className="input-field" value={form.reservedVehicleCount} onChange={(e) => setForm({ ...form, reservedVehicleCount: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reserve for use from"><input type="date" className="input-field" value={form.reservationStartDate} onChange={(e) => setForm({ ...form, reservationStartDate: e.target.value })} /></Field>
                <Field label="Reserve for use until"><input type="date" className="input-field" value={form.reservationEndDate} onChange={(e) => setForm({ ...form, reservationEndDate: e.target.value })} /></Field>
              </div>
              <Field label="Notes (optional)">
                <textarea rows={2} className="input-field" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions for this reservation…" />
              </Field>
              <p className="text-xs text-steel">We'll auto-assign the next available serial block and send it to the admin for approval. After submitting, you'll enter your payment details.</p>
            </>
          ) : (
            <>
              <Field label="Fleet name"><input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Client name"><input required className="input-field" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact"><input className="input-field" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
                <Field label="Phone"><input className="input-field" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Reserve from (e.g. FL1024)"><input className="input-field font-mono" value={form.fleetCodeFrom} onChange={(e) => setForm({ ...form, fleetCodeFrom: e.target.value.toUpperCase() })} /></Field>
                <Field label="Reserve to (e.g. FL1060)"><input className="input-field font-mono" value={form.fleetCodeTo} onChange={(e) => setForm({ ...form, fleetCodeTo: e.target.value.toUpperCase() })} /></Field>
                <Field label="Vehicle count"><input type="number" min="0" className="input-field" value={form.reservedVehicleCount} onChange={(e) => setForm({ ...form, reservedVehicleCount: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reserve for use from"><input type="date" className="input-field" value={form.reservationStartDate} onChange={(e) => setForm({ ...form, reservationStartDate: e.target.value })} /></Field>
                <Field label="Reserve for use until"><input type="date" className="input-field" value={form.reservationEndDate} onChange={(e) => setForm({ ...form, reservationEndDate: e.target.value })} /></Field>
              </div>
              <p className="text-xs text-steel">Set a future date range to reserve this fleet ahead of time. A vehicle range can be re-reserved by another client once your reservation period ends — overlapping ranges and dates are rejected automatically.</p>
            </>
          )}

          <button className="btn-accent px-4 py-2 rounded">{isClient ? 'Send for approval & pay' : 'Create'}</button>
        </form>
      </Modal>

      <Modal open={Boolean(assign)} onClose={() => setAssign(null)} title="Assign fleet">
        <form onSubmit={saveAssignment} className="space-y-4">
          <Field label="Responsible person">
            <select className="input-field" value={assignment.assignedPersonId} onChange={(e) => setAssignment({ ...assignment, assignedPersonId: e.target.value })}>
              <option value="">Select person</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
            </select>
          </Field>
          <Field label="Vehicles">
            <div className="max-h-48 overflow-y-auto border border-line rounded p-2 space-y-2">
              {vehicles.map((v) => (
                <label key={v._id} className="flex gap-2 text-sm">
                  <input type="checkbox" checked={assignment.vehicleIds.includes(v._id)} onChange={(e) => setAssignment({ ...assignment, vehicleIds: e.target.checked ? [...assignment.vehicleIds, v._id] : assignment.vehicleIds.filter((id) => id !== v._id) })} />
                  {v.vehicleNo}
                </label>
              ))}
            </div>
          </Field>
          <button className="btn-accent px-4 py-2 rounded">Save assignment — marks fleet running</button>
        </form>
      </Modal>

      <Modal open={Boolean(payFleet)} onClose={() => setPayFleet(null)} title={`Submit payment — ${payFleet?.name || ''}`}>
        <form onSubmit={savePayment} className="space-y-4">
          {paymentError && <div className="text-sm text-negative bg-negative-soft border border-negative/20 rounded px-3 py-2">{paymentError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount"><input required type="number" step="0.01" min="0.01" className="input-field" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></Field>
            <Field label="Payment mode">
              <select className="input-field" value={paymentForm.paymentType} onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}>
                <option value="online">Online</option>
                <option value="cash">Cash</option>
              </select>
            </Field>
          </div>
          {paymentForm.paymentType === 'online' ? (
            <Field label="Payment screenshot">
              <input required type="file" accept="image/*,.pdf" className="input-field" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-steel mt-1">Upload a screenshot or receipt of the transfer/UPI payment.</p>
            </Field>
          ) : (
            <Field label="Paid to (name)">
              <input required className="input-field" value={paymentForm.paidToName} onChange={(e) => setPaymentForm({ ...paymentForm, paidToName: e.target.value })} placeholder="Person you handed the cash to" />
            </Field>
          )}
          <p className="text-xs text-steel">Your payment goes to the accountant for verification. It stays "pending" on your dashboard until they confirm it.</p>
          <button disabled={paymentSaving} className="btn-accent px-4 py-2 rounded disabled:opacity-60">{paymentSaving ? 'Submitting…' : 'Submit payment'}</button>
        </form>
      </Modal>

      <Modal open={poolOpen} onClose={() => setPoolOpen(false)} title="Fleet numbering pool">
        <form onSubmit={savePool} className="space-y-4">
          {poolError && <div className="text-sm text-negative bg-negative-soft border border-negative/20 rounded px-3 py-2">{poolError}</div>}
          <p className="text-xs text-steel">This is the total serial-numbered pool clients reserve from (e.g. FL-1001 to FL-2000 = {'{'}N{'}'} fleets).</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Prefix"><input className="input-field font-mono" value={poolForm.fleetPrefix} onChange={(e) => setPoolForm({ ...poolForm, fleetPrefix: e.target.value.toUpperCase() })} /></Field>
            <Field label="Start"><input type="number" className="input-field" value={poolForm.fleetRangeStart} onChange={(e) => setPoolForm({ ...poolForm, fleetRangeStart: e.target.value })} /></Field>
            <Field label="End"><input type="number" className="input-field" value={poolForm.fleetRangeEnd} onChange={(e) => setPoolForm({ ...poolForm, fleetRangeEnd: e.target.value })} /></Field>
          </div>
          <button className="btn-accent px-4 py-2 rounded">Save pool size</button>
        </form>
      </Modal>
    </div>
  )
}

function clientFormDefaults(user) {
  return {
    ...EMPTY,
    clientName: user?.name || '',
    contactName: user?.name || '',
    contactPhone: user?.phone || '',
    notes: '',
  }
}
