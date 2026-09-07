import { tripApi, paymentApi } from "../../api/entities";
import type { Payment } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// "Overview -> Total no. of Trips, Total earning -> Breakdown of Earning."
// Earning = amounts actually paid out to the driver through the payment workflow.
export function DriverOverview() {
  const { data, isLoading, error, reload } = useApiData(async () => {
    const [trips, payments] = await Promise.all([tripApi.list(), paymentApi.list()]);
    return { trips, payments };
  });

  const trips = data?.trips ?? [];
  const payments = data?.payments ?? [];
  const paid = payments.filter((p) => p.status === "paid");
  const totalEarning = paid.reduce((sum, p) => sum + p.amount, 0);

  const columns: Column<Payment>[] = [
    { header: "Reason", render: (p) => p.reason },
    { header: "Amount", render: (p) => `₹${p.amount.toLocaleString()}` },
    { header: "Paid On", render: (p) => (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—") },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Your trips and earnings.</p>

      <div className="mt-6">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Trips</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{trips.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Earning</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">₹{totalEarning.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-primary">Earning Breakdown</h2>
            <div className="mt-3">
              <Table
                columns={columns}
                rows={paid}
                emptyMessage="No payments received yet."
                onRowClick={(p) => (window.location.href = `/payments/${p._id}`)}
              />
            </div>
          </div>

          {trips.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-text-primary">Recent Trips</h2>
              <div className="mt-3 space-y-2">
                {trips.slice(0, 5).map((t) => (
                  <div key={t._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
                    <span className="text-sm text-text-primary">
                      {t.fromLocation} → {t.toLocation}
                    </span>
                    <Badge tone={t.status === "running" ? "brand" : "success"}>{t.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
