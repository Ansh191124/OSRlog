import { useState } from "react";
import { paymentApi } from "../../api/entities";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// "Approvement -> Driver Payment Approvement."
export function ApprovementPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: payments, isLoading, error, reload } = useApiData(async () => {
    const all = await paymentApi.list();
    return all.filter((p) => p.status === "pending_vehicle_master");
  });

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    try {
      await paymentApi.vehicleMasterDecide(id, decision);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Approvement</h1>
      <p className="mt-1 text-sm text-text-secondary">Driver payment requests awaiting your approval.</p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-4 space-y-2">
          {(payments ?? []).length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
          {(payments ?? []).map((p) => (
            <div key={p._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {p.requestedBy.name} — {p.reason}
                </p>
                <p className="text-xs text-text-secondary">
                  ₹{p.amount.toLocaleString()} • <Badge tone="neutral">{p.mode}</Badge>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busyId === p._id} onClick={() => decide(p._id, "rejected")}>
                  Reject
                </Button>
                <Button disabled={busyId === p._id} onClick={() => decide(p._id, "approved")}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
