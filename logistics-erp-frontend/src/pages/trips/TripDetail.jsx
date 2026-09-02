import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DriversAPI, TripsAPI } from '../../lib/api'
import { LoadState, ErrorState, Badge, Money } from '../../components/ui'
import { ArrowLeft, Plus, Trash2, Sparkles, Pencil, Check, X, UserRoundCog } from 'lucide-react'

const REQUIRED_ENTRY_KEYS = new Set(['date', 'partyName', 'fromLocation', 'toLocation'])

const ENTRY_FIELDS = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'partyName', label: 'Party' },
  { key: 'fromLocation', label: 'From' },
  { key: 'toLocation', label: 'To' },
  { key: 'freight', label: 'Freight', type: 'number' },
  { key: 'odometer', label: 'Odometer', type: 'number' },
  { key: 'adv', label: 'Advance', type: 'number' },
  { key: 'diesel', label: 'Diesel', type: 'number' },
  { key: 'amt', label: 'Amount', type: 'number' },
]

const EXPENSE_FIELDS = ['dala', 'border', 'tollTax', 'diesel', 'salary', 'urea', 'fooding', 'ureaNagad', 'kiraya']

const SUMMARY_FIELDS = [
  'drAdv', 'expenseTotal', 'total', 'gpsKm', 'mtrKm', 'diffKm',
  'totalDieselLitres', 'totalDieselAmount', 'costPerKm', 'mileage', 'expensePercent',
  'freightPerKm', 'plPerDay', 'days', 'tankFullLitres', 'tankFullAmount',
  'freightTotal', 'expensesTotal', 'profitLoss',
]

const emptyEntry = () => ({ date: '', partyName: '', fromLocation: '', toLocation: '', freight: '', odometer: '', adv: '', diesel: '', amt: '' })

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newEntry, setNewEntry] = useState(emptyEntry())
  const [addingEntry, setAddingEntry] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editEntry, setEditEntry] = useState({})
  const [expenseForm, setExpenseForm] = useState({})
  const [summaryForm, setSummaryForm] = useState({})
  const [calculating, setCalculating] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [handover, setHandover] = useState({ driverId: '', effectiveAt: '', reason: '' })
  const [savingHandover, setSavingHandover] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await TripsAPI.get(id)
      const t = res.data?.data || res.data
      setTrip(t)
      setExpenseForm(t.expense || {})
      setSummaryForm(t.summary || {})
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load this trip sheet.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    DriversAPI.list({ limit: 100, status: 'active' })
      .then((res) => setDrivers(res.data?.data || res.data || []))
      .catch(() => setDrivers([]))
  }, [])

  const changeDriver = async (event) => {
    event.preventDefault()
    if (!handover.driverId) return
    setSavingHandover(true)
    try {
      await TripsAPI.changeDriver(id, handover)
      setHandover({ driverId: '', effectiveAt: '', reason: '' })
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not record driver change.')
    } finally { setSavingHandover(false) }
  }

  const addEntry = async (e) => {
    e.preventDefault()
    const missing = ['date', 'partyName', 'fromLocation', 'toLocation'].filter((k) => !newEntry[k]?.trim?.() && !newEntry[k])
    if (missing.length) {
      alert('Date, party, from and to are required for each leg.')
      return
    }
    setAddingEntry(true)
    try {
      const payload = numify(newEntry)
      await TripsAPI.addEntry(id, payload)
      setNewEntry(emptyEntry())
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not add leg entry.')
    } finally {
      setAddingEntry(false)
    }
  }

  const startEditEntry = (entry) => {
    setEditingEntryId(entry._id)
    setEditEntry({
      date: entry.date ? entry.date.slice(0, 10) : '', partyName: entry.partyName || '',
      fromLocation: entry.fromLocation || '', toLocation: entry.toLocation || '',
      freight: entry.freight ?? '', odometer: entry.odometer ?? '', adv: entry.adv ?? '',
      diesel: entry.diesel ?? '', amt: entry.amt ?? '',
    })
  }

  const saveEditEntry = async (entryId) => {
    const missing = ['date', 'partyName', 'fromLocation', 'toLocation'].filter((k) => !editEntry[k]?.trim?.() && !editEntry[k])
    if (missing.length) {
      alert('Date, party, from and to are required for each leg.')
      return
    }
    try {
      await TripsAPI.updateEntry(id, entryId, numify(editEntry))
      setEditingEntryId(null)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not update leg entry.')
    }
  }

  const removeEntry = async (entryId) => {
    if (!confirm('Delete this leg entry?')) return
    try {
      await TripsAPI.removeEntry(id, entryId)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not delete leg entry.')
    }
  }

  const saveExpense = async () => {
    setSavingExpense(true)
    try {
      await TripsAPI.setExpense(id, numify(expenseForm))
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save expense box.')
    } finally {
      setSavingExpense(false)
    }
  }

  const saveSummary = async () => {
    setSavingSummary(true)
    try {
      await TripsAPI.setSummary(id, numify(summaryForm))
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save summary box.')
    } finally {
      setSavingSummary(false)
    }
  }

  const runCalculate = async () => {
    setCalculating(true)
    try {
      const res = await TripsAPI.calculate(id)
      const suggested = res.data?.data || res.data
      setSummaryForm((prev) => ({ ...prev, ...suggested }))
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not calculate suggested summary.')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) return <LoadState label="Opening trip sheet" />
  if (error) return <ErrorState message={error} />
  if (!trip) return null

  return (
    <div>
      <button onClick={() => navigate('/trips')} className="flex items-center gap-1.5 text-sm text-steel hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to trip sheets
      </button>

      {/* Header, styled like the paper sheet's top box */}
      <div className="card p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-accent" />
        <div className="pl-3 flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-deep mb-1">Trip Sheet</p>
            <h1 className="font-mono text-3xl font-bold tabular">{trip.vehicleNoText || trip.vehicle?.vehicleNo || '—'}</h1>
            <p className="text-sm text-steel mt-1">Driver: {currentDriver(trip)}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-steel">Start</span><span className="tabular">{sliceDate(trip.startDate)} {trip.timeIn}</span>
            <span className="text-steel">End</span><span className="tabular">{sliceDate(trip.endDate)} {trip.timeOut}</span>
            {trip.remark && (<><span className="text-steel">Remark</span><span>{trip.remark}</span></>)}
          </div>
        </div>
      </div>

      <Section title="Driver handover" subtitle="Records a new driver from the stated time. Earlier trip data and previous handovers remain unchanged.">
        <form onSubmit={changeDriver} className="grid md:grid-cols-[1.5fr_1fr_2fr_auto] gap-3 items-end">
          <div><span className="label-field">New driver</span><select required className="input-field" value={handover.driverId} onChange={(e) => setHandover({ ...handover, driverId: e.target.value })}><option value="">Select driver…</option>{drivers.map((driver) => <option key={driver._id} value={driver._id}>{driver.name}</option>)}</select></div>
          <div><span className="label-field">Effective at</span><input required type="datetime-local" className="input-field" value={handover.effectiveAt} onChange={(e) => setHandover({ ...handover, effectiveAt: e.target.value })} /></div>
          <div><span className="label-field">Reason / note</span><input className="input-field" placeholder="Shift change, leave…" value={handover.reason} onChange={(e) => setHandover({ ...handover, reason: e.target.value })} /></div>
          <button disabled={savingHandover} className="btn-accent rounded px-4 py-2 text-sm disabled:opacity-60 flex items-center gap-1.5"><UserRoundCog className="w-4 h-4" />{savingHandover ? 'Saving…' : 'Record change'}</button>
        </form>
        {(trip.driverChanges || []).length > 0 && <div className="mt-4 border-t border-line pt-3 space-y-2 text-sm">{trip.driverChanges.map((change, index) => <div key={change._id || index} className="flex flex-wrap gap-x-3 text-steel"><span className="font-medium text-ink">{change.driverNameText || change.driver?.name || 'Driver'}</span><span>{formatDateTime(change.effectiveAt)}</span>{change.reason && <span>— {change.reason}</span>}</div>)}</div>}
      </Section>

      {/* Entries / legs */}
      <Section title="Leg entries" subtitle="Each row is one stop on this trip — party, route and figures, just like the sheet.">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-steel">
                {ENTRY_FIELDS.map((f) => <th key={f.key} className="text-left py-2 pr-3 font-semibold">{f.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(trip.entries || []).map((entry) => (
                <tr key={entry._id} className="border-b border-line/70">
                  {editingEntryId === entry._id ? (
                    <>
                      {ENTRY_FIELDS.map((f) => (
                        <td key={f.key} className="py-1.5 pr-3">
                          <input
                            type={f.type || 'text'}
                            required={REQUIRED_ENTRY_KEYS.has(f.key)}
                            className="input-field py-1 text-xs"
                            value={editEntry[f.key]}
                            onChange={(e) => setEditEntry({ ...editEntry, [f.key]: e.target.value })}
                          />
                        </td>
                      ))}
                      <td className="py-1.5 flex gap-1">
                        <button onClick={() => saveEditEntry(entry._id)} className="p-1.5 text-positive hover:bg-positive-soft rounded"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingEntryId(null)} className="p-1.5 text-steel hover:bg-paper-2 rounded"><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-3 tabular">{sliceDate(entry.date)}</td>
                      <td className="py-2 pr-3">{entry.partyName || '—'}</td>
                      <td className="py-2 pr-3">{entry.fromLocation || '—'}</td>
                      <td className="py-2 pr-3">{entry.toLocation || '—'}</td>
                      <td className="py-2 pr-3"><Money value={entry.freight} /></td>
                      <td className="py-2 pr-3 tabular">{entry.odometer ?? '—'}</td>
                      <td className="py-2 pr-3"><Money value={entry.adv} /></td>
                      <td className="py-2 pr-3"><Money value={entry.diesel} /></td>
                      <td className="py-2 pr-3"><Money value={entry.amt} /></td>
                      <td className="py-2 flex gap-1">
                        <button onClick={() => startEditEntry(entry)} className="p-1.5 text-steel hover:text-accent-deep rounded"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeEntry(entry._id)} className="p-1.5 text-steel hover:text-negative rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {(!trip.entries || trip.entries.length === 0) && (
                <tr><td colSpan={10} className="py-6 text-center text-steel text-sm">No legs added to this trip yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={addEntry} className="mt-4 pt-4 border-t border-dashed border-line grid grid-cols-2 md:grid-cols-5 gap-3">
          {ENTRY_FIELDS.map((f) => (
            <div key={f.key}>
              <span className="label-field">{f.label}</span>
              <input
                type={f.type || 'text'}
                required={REQUIRED_ENTRY_KEYS.has(f.key)}
                step={f.type === 'number' ? '0.01' : undefined}
                className="input-field"
                value={newEntry[f.key]}
                onChange={(e) => setNewEntry({ ...newEntry, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <div className="flex items-end">
            <button type="submit" disabled={addingEntry} className="btn-accent w-full rounded py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Plus className="w-4 h-4" /> {addingEntry ? 'Adding…' : 'Add leg'}
            </button>
          </div>
        </form>
      </Section>

      {/* Expense box */}
      <Section title="Expense box" subtitle="Line items exactly as filled on the paper sheet's expense box.">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {EXPENSE_FIELDS.map((k) => (
            <div key={k}>
              <span className="label-field">{prettify(k)}</span>
              <input
                type="number" step="0.01" className="input-field"
                value={expenseForm[k] ?? ''}
                onChange={(e) => setExpenseForm({ ...expenseForm, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button onClick={saveExpense} disabled={savingExpense} className="btn-accent rounded px-4 py-2 text-sm disabled:opacity-60">
          {savingExpense ? 'Saving…' : 'Save expense box'}
        </button>
      </Section>

      {/* Summary box */}
      <Section
        title="Summary box"
        subtitle="Profit/loss, mileage and cost figures. GPS KM, MTR KM and mileage still need a manual reading."
        action={
          <button onClick={runCalculate} disabled={calculating} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-accent/40 text-accent-deep hover:bg-accent-soft disabled:opacity-60">
            <Sparkles className="w-4 h-4" /> {calculating ? 'Calculating…' : 'Suggest from entries'}
          </button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {SUMMARY_FIELDS.map((k) => (
            <div key={k}>
              <span className="label-field">{prettify(k)}</span>
              <input
                type="number" step="0.01" className="input-field"
                value={summaryForm[k] ?? ''}
                onChange={(e) => setSummaryForm({ ...summaryForm, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={saveSummary} disabled={savingSummary} className="btn-accent rounded px-4 py-2 text-sm disabled:opacity-60">
            {savingSummary ? 'Saving…' : 'Save summary box'}
          </button>
          {summaryForm.profitLoss !== undefined && summaryForm.profitLoss !== '' && (
            <Badge tone={Number(summaryForm.profitLoss) < 0 ? 'negative' : 'positive'}>
              P/L ₹{Number(summaryForm.profitLoss).toLocaleString('en-IN')}
            </Badge>
          )}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, subtitle, action, children }) {
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-steel mt-0.5 max-w-lg">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function prettify(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}
function sliceDate(d) { return d ? String(d).slice(0, 10) : '—' }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('en-IN') : 'Time not recorded' }
function currentDriver(trip) {
  const changes = trip.driverChanges || []
  const latest = changes.length ? [...changes].sort((a, b) => new Date(b.effectiveAt) - new Date(a.effectiveAt))[0] : null
  return latest?.driverNameText || latest?.driver?.name || trip.driverNameText || trip.driver?.name || '—'
}
const TEXT_KEYS = new Set(['date', 'partyName', 'fromLocation', 'toLocation'])
function numify(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined || v === null) continue
    if (TEXT_KEYS.has(k)) { out[k] = v; continue }
    const n = Number(v)
    out[k] = Number.isNaN(n) ? v : n
  }
  return out
}
