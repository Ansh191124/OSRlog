import { useState } from "react";
import { tripApi } from "../../api/entities";
import type { Trip } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<Trip["status"], "success" | "brand" | "warning" | "neutral"> = {
  created: "neutral",
  running: "brand",
  completed: "success",
  closed: "success",
};

// Admin: "Trip sheet -> Can see all Trip sheet details."
// Co-Admin: same view, from their "Trip" page.
export function TripSheetPage() {
  const { data: trips, isLoading, error, reload } = useApiData(() => tripApi.list());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await tripApi.remove(id);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Trip>[] = [
    { header: "Legs", render: (t) => t.legs.length },
    {
      header: "LR Nos.",
      render: (t) => t.legs.map((l) => l.lorryReceipt?.lrNumber).filter(Boolean).join(", ") || "—",
    },
    { header: "Vehicle", render: (t) => t.vehicle.registrationNumber },
    { header: "Driver", render: (t) => t.driver?.name || "—" },
    { header: "Vehicle Master", render: (t) => t.vehicleMaster?.name || "—" },
    { header: "Route", render: (t) => [t.fromLocation, t.toLocation].filter(Boolean).join(" -> ") || "—" },
    {
      header: "Delivered",
      render: (t) => (t.allLegsDelivered ? <Badge tone="success">All legs</Badge> : `${t.legs.filter((l) => l.deliveredAt).length}/${t.legs.length}`),
    },
    { header: "Status", render: (t) => <Badge tone={statusTone[t.status]}>{t.status}</Badge> },
    {
      header: "",
      render: (t) => (
        <div className="flex gap-3">
          <a href={`/trips/${t._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button
            onClick={() => tripApi.downloadPdf(t._id, t.vehicle.registrationNumber)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Download
          </button>
          <button
            onClick={() => handleDelete(t._id)}
            disabled={busyId === t._id}
            className="text-sm font-medium text-danger-600 hover:text-danger-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Trip Sheet</h1>
      <p className="mt-1 text-sm text-text-secondary">All trips across the fleet.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={trips ?? []}
            emptyMessage="No trips yet."
            onRowClick={(t) => (window.location.href = `/trips/${t._id}`)}
          />
        </AsyncState>
      </div>
    </div>
  );
}
