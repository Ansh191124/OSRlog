import { useState } from "react";
import { vehicleApi } from "../../api/entities";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<string, "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

// Co-Admin (and Admin, full access): bulk-assign vehicles to a Vehicle
// Master and see how many vehicles each Vehicle Master currently holds.
export function VehicleAssignPage() {
  const { data: overview, isLoading, error: loadError, reload } = useApiData(() => vehicleApi.assignOverview());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetMaster, setTargetMaster] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0 || !targetMaster) return;
    setError(null);
    setIsSaving(true);
    try {
      await vehicleApi.bulkAssign(Array.from(selected), targetMaster);
      setSelected(new Set());
      setTargetMaster("");
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Vehicle Assign</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Assign vehicles to a Vehicle Master and see their current load.
      </p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
          {overview && (
            <>
      {overview.unassigned.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-text-primary">Unassigned Vehicles</h2>
          <div className="mt-3 space-y-2">
            {overview.unassigned.map((v) => (
              <label key={v._id} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={selected.has(v._id)}
                  onChange={() => toggle(v._id)}
                  className="h-4 w-4 rounded border-border"
                />
                {v.registrationNumber}
                <Badge tone={statusTone[v.status]}>{v.status.replace("_", " ")}</Badge>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <div className="w-64">
              <Select value={targetMaster} onChange={(e) => setTargetMaster(e.target.value)}>
                <option value="">Select Vehicle Master</option>
                {overview.byMaster.map((m) => (
                  <option key={m.vehicleMaster._id} value={m.vehicleMaster._id}>
                    {m.vehicleMaster.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={isSaving || selected.size === 0 || !targetMaster}>
              {isSaving ? "Assigning..." : `Assign ${selected.size || ""} Vehicle${selected.size === 1 ? "" : "s"}`}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {overview.byMaster.map((m) => (
          <div key={m.vehicleMaster._id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{m.vehicleMaster.name}</p>
                <p className="text-xs text-text-secondary">{m.vehicleMaster.email}</p>
              </div>
              <Badge tone="brand">{m.vehicleCount} vehicle{m.vehicleCount === 1 ? "" : "s"}</Badge>
            </div>
            {m.vehicles.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {m.vehicles.map((v) => (
                  <li key={v._id} className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{v.registrationNumber}</span>
                    <Badge tone={statusTone[v.status]}>{v.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">No vehicles assigned yet.</p>
            )}
          </div>
        ))}
      </div>
            </>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
