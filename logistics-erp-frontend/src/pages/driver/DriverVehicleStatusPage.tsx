import { useEffect, useState } from "react";
import { vehicleApi } from "../../api/entities";
import type { Vehicle } from "../../types/entities";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { apiClient } from "../../api/client";
import { enqueueStatusUpdate, flushQueue, getQueue } from "../../utils/offlineVehicleStatusQueue";

const statusTone: Record<Vehicle["status"], "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

// Doc: "Consider adding offline data caching for Drivers so they can update
// vehicle status in low-network areas, syncing once connectivity is restored."
export function DriverVehicleStatusPage() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(getQueue().length);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const vehicles = await vehicleApi.list();
      setVehicle(vehicles[0] || null);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || "Couldn't reach the server. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  async function trySync() {
    if (getQueue().length === 0) return;
    const { flushed, remaining } = await flushQueue();
    setPendingCount(remaining);
    if (flushed > 0) await load();
  }

  useEffect(() => {
    load();
    trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, []);

  async function setStatus(status: "available" | "maintenance") {
    if (!vehicle) return;
    setIsSaving(true);
    try {
      await apiClient.patch(`/vehicles/${vehicle._id}/driver-status`, { status });
      await load();
    } catch (err: any) {
      const isNetworkError = !err?.response;
      if (isNetworkError) {
        enqueueStatusUpdate(vehicle._id, status);
        setPendingCount(getQueue().length);
        setVehicle({ ...vehicle, status });
      } else {
        throw err;
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Update Vehicle Status</h1>
      <p className="mt-1 text-sm text-text-secondary">Report the status of your assigned vehicle.</p>

      {pendingCount > 0 && (
        <div className="mt-4 rounded-lg border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-600">
          {pendingCount} status update{pendingCount === 1 ? "" : "s"} saved offline — will sync automatically once
          you're back online.
        </div>
      )}

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={loadError} onRetry={load}>
          {!vehicle ? (
            <p className="text-sm text-text-secondary">No vehicle currently assigned to you.</p>
          ) : (
            <div className="max-w-sm rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-text-primary">{vehicle.registrationNumber}</p>
                <Badge tone={statusTone[vehicle.status]}>{vehicle.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  disabled={isSaving || vehicle.status === "available"}
                  onClick={() => setStatus("available")}
                >
                  Mark Available
                </Button>
                <Button
                  variant="secondary"
                  disabled={isSaving || vehicle.status === "maintenance"}
                  onClick={() => setStatus("maintenance")}
                >
                  Report Maintenance Needed
                </Button>
              </div>
            </div>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
