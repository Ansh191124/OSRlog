import { useCallback, useEffect, useState } from 'react'
import { FleetsAPI, TripsAPI, PaymentsAPI, SERVER_ROOT_URL } from '../lib/api'
import DataTable from '../components/DataTable'
import { Badge, Field, Modal, PageHeader, LoadState, ErrorState } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { canAccess } from '../lib/roles'
import { FileImage, ExternalLink } from 'lucide-react'

const EMPTY = { name: '', clientName: '', contactName: '', contactPhone: '', reservedVehicleCount: '', reservationStartDate: '', reservationEndDate: '' }
const PAYMENT_EMPTY = { amount: '', paymentType: 'online', paidToName: '' }
const LR_EMPTY = { lrNumber: '', lrFromLocation: '', lrToLocation: '', lrGoodsDescription: '', startDate: '', remark: '' }
const REQUEST_TONE = { requested: 'accent', approved: 'positive', rejected: 'negative' }

export default function Fleets() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [myPayments, setMyPayments] = useState([])
  const [payFleet, setPayFleet] = useState(null)
  const [paymentForm, setPaymentForm] = useState(PAYMENT_EMPTY)
  const [paymentFile, setPaymentFile] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)

  const [lrFleet, setLrFleet] = useState(null) // fleet currently creating an LR against
  const [lrForm, setLrForm] = useState(LR_EMPTY)
  const [lrPhoto, setLrPhoto] = useState(null)
  const [lrError, setLrError] = useState('')
  const [lrSaving, setLrSaving] = useState(false)

  const [lrListFleet, setLrListFleet] = useState(null) // fleet whose LR's are being viewed
  const [lrList, setLrList] = useState([])
  const [lrListLoading, setLrListLoading] = useState(false)
  const [lrListError, setLrListError] = useState(null)

  const isAdmin = user?.role === 'admin'
  const canManage = ['admin', 'co_admin'].includes(user?.role)
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
  useEffect(() => {
    // A client's role may have had the "payments" module revoked (Roles & access) while
    // still being a client - avoid a doomed request that 403s every time this page loads.
    if (!isClient || !canAccess(user, 'payments')) return
    PaymentsAPI.list({ category: 'fleet_reservation' }).then((r) => setMyPayments(r.data?.data || [])).catch(() => {})
  }, [isClient, rows.length, user])

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

  const openLrForm = (fleet) => { setLrFleet(fleet); setLrForm(LR_EMPTY); setLrPhoto(null); setLrError('') }
  const saveLr = async (e) => {
    e.preventDefault()
    setLrError('')
    if (!lrForm.lrNumber.trim()) { setLrError('Enter the LR number from the physical paper.'); return }
    if (!lrForm.lrFromLocation.trim() || !lrForm.lrToLocation.trim()) { setLrError('Enter where the goods are coming from and going to.'); return }
    if (!lrForm.lrGoodsDescription.trim()) { setLrError('Describe the goods being carried.'); return }
    if (!lrPhoto) { setLrError('Attach a photo of the LR paper.'); return }
    setLrSaving(true)
    try {
      const res = await TripsAPI.create({
        fleetId: lrFleet._id,
        lrNumber: lrForm.lrNumber.trim(),
        lrFromLocation: lrForm.lrFromLocation.trim(),
        lrToLocation: lrForm.lrToLocation.trim(),
        lrGoodsDescription: lrForm.lrGoodsDescription.trim(),
        startDate: lrForm.startDate || undefined,
        remark: lrForm.remark || undefined,
      })
      const trip = res.data?.data
      if (trip?._id) {
        const fd = new FormData(); fd.append('file', lrPhoto)
        await TripsAPI.uploadLrPhoto(trip._id, fd)
      }
      setLrFleet(null)
      load()
    } catch (err) {
      setLrError(err?.response?.data?.message || 'Could not create this LR.')
    } finally {
      setLrSaving(false)
    }
  }

  const openLrList = async (fleet) => {
    setLrListFleet(fleet); setLrList([]); setLrListError(null); setLrListLoading(true)
    try {
      const r = await TripsAPI.list({ fleetId: fleet._id, limit: 100 })
      setLrList(r.data?.data || [])
    } catch (err) {
      setLrListError(err?.response?.data?.message || 'Could not load LR history.')
    } finally {
      setLrListLoading(false)
    }
  }

  const statusBadge = (r) => {
    if (r.reservationStatus === 'approved') return <Badge tone="positive">Approved</Badge>
    if (r.reservationStatus === 'reserved') return <Badge tone="default">Awaiting approval</Badge>
    return <Badge tone="steel">None</Badge>
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
        eyebrow="LR quota"
        title="Fleets"
        description={isClient ? "Request a quota of LR's — an admin approves it, then create each LR as trips come up." : "Approve LR quotas for clients; each LR they create waits here for approval and vehicle assignment."}
        action={(canManage || isClient) && (
          <button onClick={openCreate} className="btn-accent px-3 py-2 rounded text-sm">{isClient ? 'Request LR quota' : 'Create quota'}</button>
        )}
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Fleet', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'clientName', header: 'Client' },
          { key: 'quota', header: 'LR quota used', render: (r) => <span className="tabular font-mono text-xs">{r.lrUsedCount ?? 0} / {r.reservedVehicleCount}</span> },
          { key: 'period', header: 'Reserved period', render: (r) => r.reservationStartDate && r.reservationEndDate ? <span className="text-xs">{String(r.reservationStartDate).slice(0, 10)} → {String(r.reservationEndDate).slice(0, 10)}</span> : '—' },
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
          ...(isClient ? [{
            key: 'actions', header: '', render: (r) => r.reservationStatus === 'approved' && (r.lrUsedCount ?? 0) < r.reservedVehicleCount && (
              <button onClick={(e) => { e.stopPropagation(); openLrForm(r) }} className="text-xs font-semibold text-accent-deep">Create LR</button>
            )
          }] : []),
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRowClick={openLrList}
        emptyTitle="No fleets created"
        emptyDescription={isClient ? "Request your first LR quota to get started." : "Create a client LR quota, then approve it."}
      />

      <Modal open={open} onClose={() => { setOpen(false); setFormError('') }} title={isClient ? 'Request an LR quota' : 'Create client LR quota'}>
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
              <Field label="How many LR's do you need?">
                <input required type="number" min="1" className="input-field" value={form.reservedVehicleCount} onChange={(e) => setForm({ ...form, reservedVehicleCount: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reserve for use from"><input type="date" className="input-field" value={form.reservationStartDate} onChange={(e) => setForm({ ...form, reservationStartDate: e.target.value })} /></Field>
                <Field label="Reserve for use until"><input type="date" className="input-field" value={form.reservationEndDate} onChange={(e) => setForm({ ...form, reservationEndDate: e.target.value })} /></Field>
              </div>
              <Field label="Notes (optional)">
                <textarea rows={2} className="input-field" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions for this reservation…" />
              </Field>
              <p className="text-xs text-steel">Once admin approves, you can create LR's one at a time — up to this quota — whenever a trip comes up.</p>
            </>
          ) : (
            <>
              <Field label="Fleet name"><input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Client name"><input required className="input-field" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact"><input className="input-field" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
                <Field label="Phone"><input className="input-field" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Field>
              </div>
              <Field label="LR quota (how many LR's)"><input type="number" min="0" className="input-field" value={form.reservedVehicleCount} onChange={(e) => setForm({ ...form, reservedVehicleCount: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reserve for use from"><input type="date" className="input-field" value={form.reservationStartDate} onChange={(e) => setForm({ ...form, reservationStartDate: e.target.value })} /></Field>
                <Field label="Reserve for use until"><input type="date" className="input-field" value={form.reservationEndDate} onChange={(e) => setForm({ ...form, reservationEndDate: e.target.value })} /></Field>
              </div>
            </>
          )}

          <button className="btn-accent px-4 py-2 rounded">{isClient ? 'Send for approval & pay' : 'Create'}</button>
        </form>
      </Modal>

      <Modal open={Boolean(lrFleet)} onClose={() => setLrFleet(null)} title={`Create LR — ${lrFleet?.name || ''}`}>
        <form onSubmit={saveLr} className="space-y-4">
          {lrError && <div className="text-sm text-negative bg-negative-soft border border-negative/20 rounded px-3 py-2">{lrError}</div>}
          <p className="text-xs text-steel">{lrFleet ? `${lrFleet.lrUsedCount ?? 0} of ${lrFleet.reservedVehicleCount} LR's used so far.` : ''}</p>
          <Field label="LR number (from the physical paper)">
            <input required className="input-field font-mono" value={lrForm.lrNumber} onChange={(e) => setLrForm({ ...lrForm, lrNumber: e.target.value })} placeholder="e.g. 21351" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From">
              <input required className="input-field" value={lrForm.lrFromLocation} onChange={(e) => setLrForm({ ...lrForm, lrFromLocation: e.target.value })} placeholder="e.g. Lucknow" />
            </Field>
            <Field label="To">
              <input required className="input-field" value={lrForm.lrToLocation} onChange={(e) => setLrForm({ ...lrForm, lrToLocation: e.target.value })} placeholder="e.g. Hardoi" />
            </Field>
          </div>
          <Field label="Goods / material description">
            <input required className="input-field" value={lrForm.lrGoodsDescription} onChange={(e) => setLrForm({ ...lrForm, lrGoodsDescription: e.target.value })} placeholder="What's being carried, e.g. 50 bags cement" />
          </Field>
          <Field label="LR photo">
            <input required type="file" accept="image/*,.pdf" className="input-field" onChange={(e) => setLrPhoto(e.target.files?.[0] || null)} />
            <p className="text-xs text-steel mt-1">Upload a photo or scan of the physical LR paper.</p>
          </Field>
          <Field label="Trip start date (optional)">
            <input type="date" className="input-field" value={lrForm.startDate} onChange={(e) => setLrForm({ ...lrForm, startDate: e.target.value })} />
          </Field>
          <Field label="Remark (optional)">
            <input className="input-field" value={lrForm.remark} onChange={(e) => setLrForm({ ...lrForm, remark: e.target.value })} placeholder="Party name, anything else useful for admin" />
          </Field>
          <p className="text-xs text-steel">This goes to admin for approval — once approved, the nearest available vehicle is assigned and the assigned employee will get in touch.</p>
          <button disabled={lrSaving} className="btn-accent px-4 py-2 rounded disabled:opacity-60">{lrSaving ? 'Sending…' : 'Send LR for approval'}</button>
        </form>
      </Modal>

      <Modal open={Boolean(lrListFleet)} onClose={() => setLrListFleet(null)} title={`LR's — ${lrListFleet?.name || ''}`} wide>
        {lrListLoading && <LoadState label="Loading LR history" />}
        {!lrListLoading && lrListError && <ErrorState message={lrListError} />}
        {!lrListLoading && !lrListError && (
          lrList.length ? (
            <div className="space-y-2">
              {lrList.map((trip) => (
                <div key={trip._id} className="flex items-center justify-between gap-3 border border-line rounded px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono font-medium">{trip.lrNumber || trip.tripCode}</p>
                    {(trip.lrFromLocation || trip.lrToLocation) && (
                      <p className="text-xs text-ink mt-0.5">{trip.lrFromLocation || '—'} → {trip.lrToLocation || '—'}</p>
                    )}
                    {trip.lrGoodsDescription && <p className="text-xs text-steel">{trip.lrGoodsDescription}</p>}
                    <p className="text-xs text-steel">{trip.startDate ? String(trip.startDate).slice(0, 10) : 'No date set'} {trip.vehicle?.vehicleNo ? `· Vehicle ${trip.vehicle.vehicleNo}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {trip.lrPhotoUrl && (
                      <a href={`${SERVER_ROOT_URL}${trip.lrPhotoUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-deep">
                        <FileImage className="w-3.5 h-3.5" /> Photo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <Badge tone={REQUEST_TONE[trip.requestStatus] || 'steel'}>{trip.requestStatus || 'unknown'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-steel py-8 text-center border border-dashed border-line rounded">No LR's created against this quota yet.</p>
          )
        )}
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
