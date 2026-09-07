import { vehicleApi, tripApi } from "../../api/entities";
import type { Vehicle } from "../../types/entities";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<Vehicle["status"], "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

export function VehicleMasterOverview() {
  const { data, isLoading, error, reload } = useApiData(async () => {
    const [vehicles, trips] = await Promise.all([vehicleApi.list(), tripApi.list()]);
    return { vehicles, trips };
  });

  const vehicles = data?.vehicles ?? [];
  const trips = data?.trips ?? [];
  const runningTrips = trips.filter((t) => t.status === "running").length;
  const completedTrips = trips.filter((t) => t.status === "completed" || t.status === "closed").length;

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Your assigned vehicles and trips.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Assigned Vehicles</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{vehicles.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Running Trips</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{runningTrips}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Completed Trips</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{completedTrips}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Trips</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{trips.length}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-primary">Your Vehicles</h2>
            <div className="mt-3 space-y-2">
              {vehicles.length === 0 && <p className="text-sm text-text-secondary">No vehicles assigned to you yet.</p>}
              {vehicles.map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5"
                >
                  <span className="text-sm font-medium text-text-primary">{v.registrationNumber}</span>
                  <Badge tone={statusTone[v.status]}>{v.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
