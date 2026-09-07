import { useState } from "react";
import { lorryReceiptApi } from "../../api/entities";
import type { LorryReceipt } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Field";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<LorryReceipt["status"], "success" | "warning" | "danger" | "brand" | "neutral"> = {
  requested: "warning",
  approved: "brand",
  rejected: "danger",
  assigned: "brand",
  used: "success",
};

const loadingSlipTone: Record<string, "success" | "warning" | "danger" | "brand" | "neutral"> = {
  awaiting_payment: "warning",
  payment_submitted: "brand",
  verified: "success",
  payment_rejected: "danger",
};

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date (Newest First)" },
  { value: "date_asc", label: "Date (Oldest First)" },
  { value: "lrNumber_asc", label: "LR No. (Low to High)" },
  { value: "lrNumber_desc", label: "LR No. (High to Low)" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function AllLorryReceiptsPage() {
  const [sort, setSort] = useState<SortValue>("lrNumber_asc");
  const [sortBy, order] = sort.split("_") as ["date" | "lrNumber", "asc" | "desc"];
  const { data: lrs, isLoading, error, reload } = useApiData(() => lorryReceiptApi.list({ sortBy, order }), [sort]);

  const columns: Column<LorryReceipt>[] = [
    { header: "LR No.", render: (l) => <span className="font-medium">{l.lrNumber}</span> },
    { header: "Client", render: (l) => l.client?.name || "—" },
    { header: "Route", render: (l) => `${l.fromLocation} -> ${l.toLocation}` },
    { header: "Created", render: (l) => new Date(l.createdAt).toLocaleString() },
    {
      header: "Loading Slip",
      render: (l) =>
        l.loadingSlip ? (
          <Badge tone={loadingSlipTone[l.loadingSlip.status]}>{l.loadingSlip.status.replace(/_/g, " ")}</Badge>
        ) : (
          <Badge tone="neutral">Not created</Badge>
        ),
    },
    { header: "Status", render: (l) => <Badge tone={statusTone[l.status]}>{l.status}</Badge> },
    {
      header: "",
      render: (l) => (
        <div className="flex gap-3">
          <a href={`/lorry-receipts/${l._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button
            onClick={() => lorryReceiptApi.downloadPdf(l._id, l.lrNumber)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Download
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Lorry Receipt</h1>
          <p className="mt-1 text-sm text-text-secondary">All Lorry Receipts across every client.</p>
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortValue)} className="w-56">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={lrs ?? []}
            emptyMessage="No Lorry Receipts yet."
            onRowClick={(l) => (window.location.href = `/lorry-receipts/${l._id}`)}
          />
        </AsyncState>
      </div>
    </div>
  );
}
