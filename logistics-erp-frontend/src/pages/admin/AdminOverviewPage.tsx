import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { overviewApi } from "../../api/entities";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

type Range = "daily" | "weekly" | "monthly" | "yearly";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const COLORS = { received: "#5c8a68", sent: "#a75b52", net: "#34526f", pending: "#b8924a", grid: "#e0e3e8", axis: "#666e7d" };

export function AdminOverviewPage() {
  const [range, setRange] = useState<Range>("daily");
  const { data, isLoading, error, reload } = useApiData(() => overviewApi.admin(range), [range]);

  const cards = data
    ? [
        { label: "Running Trips", value: data.trips.running },
        { label: "Completed Trips", value: data.trips.completed },
        { label: "Overall Trips", value: data.trips.overall },
        { label: "Employees", value: data.employeeCount },
        { label: "Drivers", value: data.driverCount },
      ]
    : [];

  const totalReceived = data?.plSeries.reduce((sum, r) => sum + r.received, 0) ?? 0;
  const totalSent = data?.plSeries.reduce((sum, r) => sum + r.sent, 0) ?? 0;
  const totalProfitLoss = totalReceived - totalSent;
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label;

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Business-wide performance at a glance.</p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">{c.label}</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{c.value}</p>
            </div>
          ))}
        </div>

        {data && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">Profit / Loss ({rangeLabel})</p>
            <p className={`mt-2 text-3xl font-semibold ${totalProfitLoss >= 0 ? "text-success-600" : "text-danger-600"}`}>
              ₹{totalProfitLoss.toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
              <span>
                Received: <span className="font-medium text-success-600">₹{totalReceived.toLocaleString()}</span>
              </span>
              <span>
                Sent: <span className="font-medium text-danger-600">₹{totalSent.toLocaleString()}</span>
              </span>
              <span>Net cash movement (received − sent) from the ledger for the selected period.</span>
            </div>
          </div>
        )}

        {data && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Pending to Receive</p>
              <p className="mt-2 text-2xl font-semibold text-warning-600">₹{data.pending.receivable.toLocaleString()}</p>
              <p className="mt-1 text-xs text-text-secondary">Unverified/unpaid Loading Slip balances</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Pending to Pay</p>
              <p className="mt-2 text-2xl font-semibold text-danger-600">₹{data.pending.payable.toLocaleString()}</p>
              <p className="mt-1 text-xs text-text-secondary">Approved driver payments &amp; inventory purchases awaiting payout</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Pending Amount</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">₹{data.pending.total.toLocaleString()}</p>
              <p className="mt-1 text-xs text-text-secondary">Receivable + payable combined</p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Pending, Received, Sent &amp; Net</h2>
            <div className="flex gap-1 rounded-md border border-border p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === opt.value ? "bg-brand-600 text-white" : "text-text-secondary hover:bg-surface-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!data || data.plSeries.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">No ledger activity in this period yet.</p>
          ) : (
            <>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={data.plSeries} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.net} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.net} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.axis }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.axis }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.grid}`, fontSize: 12 }}
                      formatter={(value) => `₹${Number(value ?? 0).toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="received" name="Received" stroke={COLORS.received} fill={COLORS.received} fillOpacity={0.15} />
                    <Area type="monotone" dataKey="sent" name="Sent" stroke={COLORS.sent} fill={COLORS.sent} fillOpacity={0.15} />
                    <Area type="monotone" dataKey="pending" name="Pending" stroke={COLORS.pending} fill={COLORS.pending} fillOpacity={0.15} />
                    <Area type="monotone" dataKey="net" name="Net" stroke={COLORS.net} fill="url(#netGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                      <th className="py-1.5 pr-4">Block</th>
                      <th className="py-1.5 pr-4">Pending</th>
                      <th className="py-1.5 pr-4">Received</th>
                      <th className="py-1.5 pr-4">Sent</th>
                      <th className="py-1.5">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.plSeries.map((row) => (
                      <tr key={row.label} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-4 font-medium text-text-primary">{row.label}</td>
                        <td className="py-1.5 pr-4 text-warning-600">₹{row.pending.toLocaleString()}</td>
                        <td className="py-1.5 pr-4 text-success-600">₹{row.received.toLocaleString()}</td>
                        <td className="py-1.5 pr-4 text-danger-600">₹{row.sent.toLocaleString()}</td>
                        <td className="py-1.5 font-medium text-text-primary">₹{row.net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </AsyncState>
    </div>
  );
}
