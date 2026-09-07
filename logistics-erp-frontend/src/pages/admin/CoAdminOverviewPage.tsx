import { overviewApi } from "../../api/entities";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<string, "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

// Co-Admin gets everything except the total P/L figure (explicit doc restriction).
export function CoAdminOverviewPage() {
  const { data, isLoading, error, reload } = useApiData(() => overviewApi.coAdmin());

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Trips, people and fleet status.</p>

      <div className="mt-6">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          {data && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Running Trips", value: data.runningTrips },
                  { label: "Completed Trips", value: data.completedTrips },
                  { label: "Employees", value: data.employeeCount },
                  { label: "Drivers", value: data.driverCount },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
                    <p className="text-sm text-text-secondary">{c.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-text-primary">Vehicle Status</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.entries(data.vehicleStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Badge tone={statusTone[status]}>{status.replace("_", " ")}</Badge>
                      <span className="text-sm font-medium text-text-primary">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
