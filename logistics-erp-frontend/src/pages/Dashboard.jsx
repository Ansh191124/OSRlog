import { useEffect, useState } from 'react'
import { DashboardAPI, FleetsAPI, OrgSettingsAPI } from '../lib/api'
import { StatCard, LoadState, ErrorState, PageHeader, Badge } from '../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { useAuth } from '../context/AuthContext'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'client') return <ClientDashboard />
  return <AdminDashboard />
}

function ClientDashboard() {
  const [fleets, setFleets] = useState([])
  const [pool, setPool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const [fl, pl] = await Promise.all([FleetsAPI.list(), OrgSettingsAPI.fleetPool()])
        if (cancelled) return
        setFleets(fl.data?.data || [])
        setPool(pl.data?.data || null)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Could not load your fleet overview.')
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    const timer = window.setInterval(load, 30000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  const reserved = fleets.filter((f) => f.reservationStatus === 'reserved').length
  const approved = fleets.filter((f) => f.reservationStatus === 'approved').length
  const running = fleets.filter((f) => f.status === 'active').length
  const totalVehicles = fleets.reduce((sum, f) => sum + (f.vehicles?.length || 0), 0)

  return (
    <div>
      <PageHeader eyebrow="Your fleet" title="Fleet overview" description="Live status of the fleets you've reserved. Refreshes automatically every 30 seconds." />
      {loading && <LoadState label="Pulling your fleet status" />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Awaiting Approval" value={reserved} sub="Sent to admin" />
            <StatCard label="Approved" value={approved} sub="Waiting on vehicle assignment" />
            <StatCard label="Running" value={running} sub="Vehicles assigned and active" />
            <StatCard label="Vehicles Assigned" value={totalVehicles} sub="Across all your fleets" />
          </div>
          {pool && (
            <div className="card p-5">
              <h2 className="font-display text-lg mb-2">Fleet pool availability</h2>
              <p className="text-sm text-steel">{pool.remainingSlots} of {pool.totalSlots} serial fleet slots ({pool.fleetPrefix}-{pool.fleetRangeStart} to {pool.fleetPrefix}-{pool.fleetRangeEnd}) are currently unreserved.</p>
            </div>
          )}
          <div className="card p-5">
            <h2 className="font-display text-lg mb-4">Your fleets</h2>
            {fleets.length ? (
              <div className="space-y-3">
                {fleets.map((f) => (
                  <div key={f._id} className="flex items-center justify-between border border-line rounded px-4 py-3">
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-steel font-mono">{f.fleetCodeFrom} – {f.fleetCodeTo} · {f.reservedVehicleCount} vehicle(s)</p>
                    </div>
                    <Badge tone={f.status === 'active' ? 'positive' : f.reservationStatus === 'approved' ? 'accent' : 'default'}>
                      {f.status === 'active' ? 'Running' : f.reservationStatus === 'approved' ? 'Approved · awaiting assignment' : f.reservationStatus === 'reserved' ? 'Awaiting admin approval' : f.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-steel py-6 text-center">No fleets reserved yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminDashboard() {
  const [period, setPeriod] = useState('daily')
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [vehiclePerf, setVehiclePerf] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [ov, tr, vp] = await Promise.all([
          DashboardAPI.overview(),
          DashboardAPI.trend({ period }),
          DashboardAPI.vehiclePerformance({}),
        ])
        if (cancelled) return
        setOverview(ov.data?.data || ov.data)
        setTrend(tr.data?.data || tr.data || [])
        setVehiclePerf(vp.data?.data || vp.data || [])
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Could not reach the API. Confirm the backend is running and VITE_API_BASE_URL is set correctly.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const timer = window.setInterval(load, 15000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [period])

  return (
    <div>
      <PageHeader
        eyebrow="Dispatch board"
        title="Overview"
        description="Live daily fleet, freight, expense and profit updates. Refreshes automatically every 15 seconds."
        action={
          <div className="flex gap-1 bg-white border border-line rounded p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors
                  ${period === p ? 'bg-accent text-white' : 'text-steel hover:text-ink'}`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {loading && <LoadState label="Pulling today's numbers" />}
      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Today's Freight" value={fmt(overview?.today?.freight ?? overview?.todayFreight)} />
            <StatCard label="Today's P/L" value={fmt(overview?.today?.profitLoss ?? overview?.todayProfitLoss)} tone={pl(overview?.today?.profitLoss ?? overview?.todayProfitLoss)} />
            <StatCard label="All-time Profit/Loss" value={fmt(overview?.allTime?.profitLoss ?? overview?.totalProfitLoss)} tone={pl(overview?.allTime?.profitLoss ?? overview?.totalProfitLoss)} />
            <StatCard label="Daily Fleet" value={overview?.dailyFleet?.length ?? 0} sub="Trips scheduled today" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <StatCard label="Cash Book" value={fmt(overview?.cashOnline?.cash ?? overview?.cashTotal)} sub="Received − paid, cash" />
            <StatCard label="Online Book" value={fmt(overview?.cashOnline?.online ?? overview?.onlineTotal)} sub="Received − paid, online" />
            <StatCard label="Maintenance Pending" value={overview?.maintenanceCounts?.pending ?? overview?.pendingMaintenance ?? '—'} sub="Needs scheduling" />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <StatCard label="Today's Fleet Activity" value={overview?.fleetCounts?.today ?? '—'} sub="Fleets created or updated today · live" />
            <StatCard label="Fleets Reserved" value={overview?.fleetCounts?.reserved ?? '—'} sub="Awaiting or holding a reservation" />
            <StatCard label="Fleets Running" value={overview?.fleetCounts?.running ?? '—'} sub="Vehicles assigned, in service" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Profit / loss trend</h2>
              <Badge tone="accent">{period}</Badge>
            </div>
            {trend?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={normalizeTrend(trend)}>
                  <CartesianGrid stroke="#D9DBD3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={{ stroke: '#D9DBD3' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #D9DBD3', fontSize: 12 }} />
                  <Line type="monotone" dataKey="freight" stroke="#5B6472" strokeWidth={2} dot={false} name="Freight" />
                  <Line type="monotone" dataKey="profitLoss" stroke="#FF6A13" strokeWidth={2.5} dot={false} name="P/L" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-steel py-10 text-center">No trip data logged for this period yet.</p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-display text-lg mb-4">Vehicle performance</h2>
            {vehiclePerf?.length ? (
              <ResponsiveContainer width="100%" height={Math.max(220, vehiclePerf.length * 44)}>
                <BarChart data={normalizeVehiclePerf(vehiclePerf)} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="#D9DBD3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={{ stroke: '#D9DBD3' }} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: '#1B1F27' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #D9DBD3', fontSize: 12 }} />
                  <Bar dataKey="profitLoss" fill="#FF6A13" radius={[0, 3, 3, 0]} name="Profit / loss" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-steel py-10 text-center">No vehicle performance data yet — log a few trips first.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(v) {
  if (v === undefined || v === null) return '—'
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
function pl(v) {
  if (v === undefined || v === null) return 'default'
  return Number(v) < 0 ? 'negative' : 'positive'
}
function normalizeTrend(trend) {
  return trend.map((t) => ({
    label: t.period || t.label || t._id || t.date,
    freight: t.freightTotal ?? t.freight ?? 0,
    profitLoss: t.profitLoss ?? t.pl ?? 0,
  }))
}
function normalizeVehiclePerf(vp) {
  return vp.map((v) => ({
    label: v.vehicleNo || v.vehicleNoText || v.label || 'Vehicle',
    profitLoss: v.profitLoss ?? v.pl ?? 0,
  }))
}
