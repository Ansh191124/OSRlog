import { vehicleApi } from "../../api/entities";
import type { Vehicle } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<Vehicle["status"], "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

// Admin/Co-Admin: read-only view of every vehicle and its current status.
export function VehicleStatusPage() {
  const { data: vehicles, isLoading, error, reload } = useApiData(() => vehicleApi.list());

  const columns: Column<Vehicle>[] = [
    { header: "Registration No.", render: (v) => <span className="font-medium">{v.registrationNumber}</span> },
    { header: "Type", render: (v) => v.type || "—" },
    { header: "Base Location", render: (v) => v.baseLocation || "—" },
    { header: "Vehicle Master", render: (v) => v.assignedVehicleMaster?.name || "Unassigned" },
    { header: "Current Driver", render: (v) => v.currentDriver?.name || "—" },
    { header: "Status", render: (v) => <Badge tone={statusTone[v.status]}>{v.status.replace("_", " ")}</Badge> },
    {
      header: "",
      render: (v) => (
        <a href={`/vehicles/${v._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Vehicle Status</h1>
      <p className="mt-1 text-sm text-text-secondary">All vehicles and their current status.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={vehicles ?? []}
            emptyMessage="No vehicles yet."
            onRowClick={(v) => (window.location.href = `/vehicles/${v._id}`)}
          />
        </AsyncState>
      </div>
    </div>
  );
}
