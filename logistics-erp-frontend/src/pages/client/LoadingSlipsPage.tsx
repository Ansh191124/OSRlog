import { loadingSlipApi } from "../../api/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { LoadingSlip } from "../../types/entities";

const statusTone: Record<LoadingSlip["status"], "success" | "warning" | "danger" | "brand"> = {
  awaiting_payment: "warning",
  payment_submitted: "brand",
  verified: "success",
  payment_rejected: "danger",
};

export function LoadingSlipsPage() {
  const { data: loadingSlips, isLoading, error, reload } = useApiData(() => loadingSlipApi.list());

  const columns: Column<LoadingSlip>[] = [
    { header: "Slip No.", render: (s) => <span className="font-medium">{s.slipNumber}</span> },
    { header: "LR No.", render: (s) => s.lorryReceipt?.lrNumber ?? "—" },
    { header: "Route", render: (s) => `${s.lorryReceipt?.fromLocation} -> ${s.lorryReceipt?.toLocation}` },
    { header: "Balance (To Pay)", render: (s) => `₹${s.balance.toLocaleString()}` },
    { header: "Status", render: (s) => <Badge tone={statusTone[s.status]}>{s.status.replace(/_/g, " ")}</Badge> },
    {
      header: "",
      render: (s) => (
        <a
          href={
            ["awaiting_payment", "payment_rejected"].includes(s.status)
              ? `/client/loading-slips/${s._id}`
              : `/loading-slips/${s._id}`
          }
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {["awaiting_payment", "payment_rejected"].includes(s.status) ? "Review & Pay" : "View"}
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Loading Slips</h1>
      <p className="mt-1 text-sm text-text-secondary">Review terms, pay, and track verification status.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={loadingSlips ?? []}
            emptyMessage="No Loading Slips yet."
            onRowClick={(s) =>
              (window.location.href = ["awaiting_payment", "payment_rejected"].includes(s.status)
                ? `/client/loading-slips/${s._id}`
                : `/loading-slips/${s._id}`)
            }
          />
        </AsyncState>
      </div>
    </div>
  );
}
