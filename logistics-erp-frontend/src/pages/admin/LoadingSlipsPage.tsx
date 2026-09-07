import { lorryReceiptApi, loadingSlipApi } from "../../api/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { LoadingSlip } from "../../types/entities";

const statusTone: Record<LoadingSlip["status"], "success" | "warning" | "danger" | "brand"> = {
  awaiting_payment: "warning",
  payment_submitted: "brand",
  verified: "success",
  payment_rejected: "danger",
};

// Co-Admin/Admin: create the commercial Loading Slip for an already-approved LR,
// and see the status of every Loading Slip as it moves through the client-pay ->
// accountant-verify pipeline.
export function LoadingSlipsPage() {
  const { data, isLoading, error, reload } = useApiData(async () => {
    const [lrs, loadingSlips] = await Promise.all([lorryReceiptApi.list(), loadingSlipApi.list()]);
    return {
      awaitingSlip: lrs.filter((l) => l.status === "approved" && !l.loadingSlip),
      loadingSlips,
    };
  });

  const awaitingSlip = data?.awaitingSlip ?? [];
  const loadingSlips = data?.loadingSlips ?? [];

  const columns: Column<LoadingSlip>[] = [
    { header: "Slip No.", render: (s) => <span className="font-medium">{s.slipNumber}</span> },
    { header: "LR No.", render: (s) => s.lorryReceipt?.lrNumber ?? "—" },
    { header: "Client", render: (s) => s.client?.companyName || s.client?.name || "—" },
    { header: "Total Amount", render: (s) => `₹${s.totalAmount.toLocaleString()}` },
    { header: "Status", render: (s) => <Badge tone={statusTone[s.status]}>{s.status.replace(/_/g, " ")}</Badge> },
    {
      header: "",
      render: (s) => (
        <a href={`/loading-slips/${s._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Loading Slips</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Create the freight/payment terms for approved LRs, and track every Loading Slip's status.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-text-primary">Approved LRs Awaiting a Loading Slip</h2>
          <div className="mt-3 space-y-2">
            {awaitingSlip.length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
            {awaitingSlip.map((lr) => (
              <div key={lr._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    LR #{lr.lrNumber} — {lr.client?.name || "Temporary / Walk-in"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {lr.fromLocation} -&gt; {lr.toLocation}
                  </p>
                </div>
                <Button onClick={() => (window.location.href = `/admin/loading-slips/new?lorryReceiptId=${lr._id}`)}>
                  Create Loading Slip
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-text-primary">All Loading Slips</h2>
          <div className="mt-3">
            <Table
              columns={columns}
              rows={loadingSlips}
              emptyMessage="No Loading Slips yet."
              onRowClick={(s) => (window.location.href = `/loading-slips/${s._id}`)}
            />
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
