import { useEffect, useState } from "react";
import { lorryReceiptApi, reservationApi, vehicleApi } from "../../api/entities";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const VEHICLE_POLL_MS = 10000;

export function LRApprovalPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading, error, reload } = useApiData(async () => {
    const [lrList, reservationList] = await Promise.all([lorryReceiptApi.list(), reservationApi.list()]);
    return {
      lrs: lrList.filter((l) => l.status === "requested"),
      reservations: reservationList.filter((r) => r.status === "pending"),
    };
  });

  // Vehicle availability is polled independently and on its own cadence, so
  // the "N vehicles available" badge stays live — reflecting every vehicle's
  // current status and base location — without re-fetching the request lists.
  const { data: vehicles, reload: reloadVehicles } = useApiData(() => vehicleApi.list());
  useEffect(() => {
    const timer = setInterval(reloadVehicles, VEHICLE_POLL_MS);
    return () => clearInterval(timer);
  }, [reloadVehicles]);

  const lrs = data?.lrs ?? [];
  const reservations = data?.reservations ?? [];

  function availableAt(location: string) {
    return (vehicles ?? []).filter(
      (v) => v.status === "available" && (v.baseLocation || "").trim().toLowerCase() === location.trim().toLowerCase()
    ).length;
  }

  async function decideLr(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    try {
      await lorryReceiptApi.decide(id, decision);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function decideReservation(id: string, decision: "approved" | "rejected", requestedCount: number) {
    setBusyId(id);
    try {
      await reservationApi.decide(id, decision, decision === "approved" ? requestedCount : undefined);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">LR Approval</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Approve or reject Lorry Receipt requests and reservation requests.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary">Reservation Requests</h2>
          <div className="mt-3 space-y-2">
            {reservations.length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
            {reservations.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {r.client.name} {r.client.companyName ? `(${r.client.companyName})` : ""}
                  </p>
                  <p className="text-xs text-text-secondary">Requesting {r.requestedCount} LR(s)</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={busyId === r._id}
                    onClick={() => decideReservation(r._id, "rejected", r.requestedCount)}
                  >
                    Reject
                  </Button>
                  <Button disabled={busyId === r._id} onClick={() => decideReservation(r._id, "approved", r.requestedCount)}>
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-text-primary">Lorry Receipt Requests</h2>
          <div className="mt-3 space-y-2">
            {lrs.length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
            {lrs.map((l) => {
              const count = availableAt(l.fromLocation);
              return (
                <div key={l._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      LR #{l.lrNumber} — {l.client?.name || "Temporary / Walk-in"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {l.fromLocation} → {l.toLocation} • {l.goodsDescription || "No description"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={count > 0 ? "success" : "danger"}>
                      {count} vehicle{count === 1 ? "" : "s"} available at {l.fromLocation}
                    </Badge>
                    <Badge tone="warning">requested</Badge>
                    <Button variant="secondary" disabled={busyId === l._id} onClick={() => decideLr(l._id, "rejected")}>
                      Reject
                    </Button>
                    <Button disabled={busyId === l._id} onClick={() => decideLr(l._id, "approved")}>
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
