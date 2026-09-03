import { useNavigate } from 'react-router-dom'
import { Modal, StatCard, Badge, Money, LoadState, ErrorState } from './ui'
import { Pencil, ExternalLink, Wrench } from 'lucide-react'

export default function TripPerformanceModal({
  open,
  onClose,
  title,
  subtitle,
  summary,
  trips,
  loading,
  error,
  onEdit,
  editLabel = 'Edit',
  partnerLabel = 'Vehicle',
  partnerValue,
  mode = 'vehicle', // 'vehicle' shows company P/L; 'driver' shows the driver's actual pay, never trip P/L
  vehicleDetails, // optional {label: value} map of RC/insurance/permit/fitness/PUC etc, vehicle mode only
  maintenance, // optional recent Maintenance[] for this vehicle, vehicle mode only
}) {
  const navigate = useNavigate()
  const isDriver = mode === 'driver'

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      {subtitle && <p className="text-sm text-steel -mt-2 mb-4">{subtitle}</p>}

      {loading && <LoadState label="Loading trip earnings" />}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && summary && (
        <div className="space-y-6">
          {vehicleDetails && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(vehicleDetails).map(([label, value]) => (
                <div key={label}>
                  <p className="label-field">{label}</p>
                  <p className="text-sm tabular">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className={`grid grid-cols-2 gap-4 ${isDriver ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
            <StatCard label="Trip sheets" value={summary.tripCount ?? 0} />
            <StatCard label="Total freight" value={fmt(summary.totalFreight)} />
            {isDriver ? (
              <StatCard label="Earnings" value={fmt(summary.totalEarning)} tone={summary.totalEarning ? 'positive' : 'default'} />
            ) : (
              <>
                <StatCard label="Total expenses" value={fmt(summary.totalExpenses)} />
                <StatCard
                  label="Total P/L"
                  value={fmt(summary.totalProfitLoss)}
                  tone={plTone(summary.totalProfitLoss)}
                />
              </>
            )}
          </div>

          {maintenance && (
            <div>
              <h3 className="font-display text-lg mb-3">Recent maintenance</h3>
              {maintenance.length ? (
                <ul className="space-y-2">
                  {maintenance.map((m) => (
                    <li key={m._id} className="flex items-center justify-between gap-3 border border-line rounded px-3 py-2 text-sm">
                      <span className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-accent-deep" /> {m.maintenanceType || 'Maintenance'}</span>
                      <span className="flex items-center gap-2 text-xs text-steel">
                        {m.nextDueDate && <span>Next due {sliceDate(m.nextDueDate)}</span>}
                        <Badge tone={m.status === 'completed' ? 'positive' : m.status === 'cancelled' ? 'steel' : 'accent'}>{m.status}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-steel py-4 text-center border border-dashed border-line rounded">No maintenance records for this vehicle yet.</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-display text-lg">Trip breakdown</h3>
              {onEdit && (
                <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep">
                  <Pencil className="w-3.5 h-3.5" /> {editLabel}
                </button>
              )}
            </div>

            {trips?.length ? (
              <div className="overflow-x-auto border border-line rounded">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-line bg-paper-2/60 text-xs uppercase tracking-wide text-steel">
                      <th className="text-left px-3 py-2.5 font-semibold">Trip</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                      <th className="text-left px-3 py-2.5 font-semibold">{partnerLabel}</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Freight</th>
                      {isDriver ? (
                        <th className="text-right px-3 py-2.5 font-semibold">Earning</th>
                      ) : (
                        <>
                          <th className="text-right px-3 py-2.5 font-semibold">Expenses</th>
                          <th className="text-right px-3 py-2.5 font-semibold">P/L</th>
                        </>
                      )}
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip._id} className="border-b border-line/70 last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs">{trip.tripCode || '—'}</td>
                        <td className="px-3 py-2.5 tabular">{sliceDate(trip.startDate)}</td>
                        <td className="px-3 py-2.5">{partnerValue(trip)}</td>
                        <td className="px-3 py-2.5 text-right"><Money value={trip.summary?.freightTotal} /></td>
                        {isDriver ? (
                          <td className="px-3 py-2.5 text-right"><Money value={driverEarning(trip)} /></td>
                        ) : (
                          <>
                            <td className="px-3 py-2.5 text-right"><Money value={trip.summary?.expensesTotal} /></td>
                            <td className="px-3 py-2.5 text-right"><Money value={trip.summary?.profitLoss} /></td>
                          </>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => { onClose(); navigate(`/trips/${trip._id}`) }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-deep"
                          >
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-steel py-8 text-center border border-dashed border-line rounded">
                {isDriver
                  ? 'No trip sheets linked yet. Earnings appear here once trips log a salary or advance for this driver.'
                  : 'No trip sheets linked yet. P/L totals appear here once trips are logged and their summary is saved.'}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function fmt(v) {
  if (v === undefined || v === null) return '—'
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function plTone(v) {
  if (v === undefined || v === null || v === '') return 'default'
  return Number(v) < 0 ? 'negative' : 'positive'
}

// A driver's actual pay for one trip - never the trip's company P/L.
function driverEarning(trip) {
  const salary = trip.expense?.salary || 0
  const advances = (trip.entries || []).reduce((sum, entry) => sum + (entry.adv || 0), 0)
  return salary + advances
}

function sliceDate(d) {
  return d ? String(d).slice(0, 10) : '—'
}
