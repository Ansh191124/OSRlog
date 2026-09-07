import { ledgerApi } from "../../api/entities";
import type { LedgerEntry } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// Admin: "Payment Logs -> All type of Payment either cash or online like a cashbook."
export function PaymentLogsPage() {
  const { data: entries, isLoading, error, reload } = useApiData(() => ledgerApi.list());

  const columns: Column<LedgerEntry>[] = [
    { header: "Mode", render: (e) => <Badge tone="neutral">{e.mode}</Badge> },
    { header: "Direction", render: (e) => <Badge tone={e.direction === "received" ? "success" : "warning"}>{e.direction}</Badge> },
    { header: "Amount", render: (e) => `₹${e.amount.toLocaleString()}` },
    { header: "Party", render: (e) => e.party || "—" },
    {
      header: "Description",
      render: (e) =>
        e.description ||
        e.relatedPayment?.reason ||
        (e.relatedLoadingSlip ? `Loading Slip #${e.relatedLoadingSlip.slipNumber}` : null) ||
        (e.relatedInventoryPurchase ? `Inventory — ${e.relatedInventoryPurchase.itemName}` : "—"),
    },
    { header: "Recorded By", render: (e) => e.recordedBy?.name || "—" },
    { header: "Date", render: (e) => new Date(e.date).toLocaleDateString() },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Payment Logs</h1>
      <p className="mt-1 text-sm text-text-secondary">All cash and online payments across the business.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table columns={columns} rows={entries ?? []} emptyMessage="No payment log entries yet." />
        </AsyncState>
      </div>
    </div>
  );
}
