import { useState, type FormEvent } from "react";
import { lorryReceiptApi } from "../../api/entities";
import type { LorryReceipt } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import { useApp } from "../../context/AppContext";

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

const TRUCK_SIZES = [14, 17, 19, 22, 24, 32, 34];

const emptyForm = {
  fromLocation: "",
  toLocation: "",
  goodsDescription: "",
  truckSizeFt: "",
  consignorName: "",
  consignorAddress: "",
  consigneeName: "",
  consigneeAddress: "",
};

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date (Newest First)" },
  { value: "date_asc", label: "Date (Oldest First)" },
  { value: "lrNumber_asc", label: "LR No. (Low to High)" },
  { value: "lrNumber_desc", label: "LR No. (High to Low)" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function LorryReceiptsPage() {
  const { user } = useApp();
  const [sort, setSort] = useState<SortValue>("lrNumber_asc");
  const [sortBy, order] = sort.split("_") as ["date" | "lrNumber", "asc" | "desc"];
  const { data: lrs, isLoading, error: loadError, reload } = useApiData(
    () => lorryReceiptApi.list({ sortBy, order }),
    [sort]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function useMeAsConsignor() {
    setForm({ ...form, consignorName: user?.companyName || user?.name || "", consignorAddress: user?.address || "" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await lorryReceiptApi.create({
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        goodsDescription: form.goodsDescription,
        truckSizeFt: form.truckSizeFt ? Number(form.truckSizeFt) : null,
        consignor: { name: form.consignorName, address: form.consignorAddress },
        consignee: { name: form.consigneeName, address: form.consigneeAddress },
      });
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<LorryReceipt>[] = [
    { header: "LR No.", render: (l) => <span className="font-medium">{l.lrNumber}</span> },
    { header: "Bill No.", render: (l) => l.billNumber },
    { header: "Route", render: (l) => `${l.fromLocation} -> ${l.toLocation}` },
    { header: "Created", render: (l) => new Date(l.createdAt).toLocaleString() },
    { header: "Consignee", render: (l) => l.consignee?.name || "—" },
    { header: "Status", render: (l) => <Badge tone={statusTone[l.status]}>{l.status}</Badge> },
    {
      header: "Loading Slip",
      render: (l) =>
        l.loadingSlip ? (
          <Badge tone={loadingSlipTone[l.loadingSlip.status]}>{l.loadingSlip.status.replace(/_/g, " ")}</Badge>
        ) : (
          <Badge tone="neutral">Not created</Badge>
        ),
    },
    {
      header: "",
      render: (l) => (
        <div className="flex gap-3">
          <a href={`/lorry-receipts/${l._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          {l.loadingSlip && ["awaiting_payment", "payment_rejected", "payment_submitted", "verified"].includes(l.loadingSlip.status) && (
            <a
              href={`/client/loading-slips/${l.loadingSlip._id}`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {["awaiting_payment", "payment_rejected"].includes(l.loadingSlip.status) ? "Review & Pay" : "View Loading Slip"}
            </a>
          )}
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Lorry Receipts</h1>
          <p className="text-sm text-text-secondary">Create an LR with route and consignor/consignee detail.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortValue)} className="w-56">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button onClick={openCreate}>Create LR</Button>
        </div>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={lrs ?? []}
          emptyMessage="No Lorry Receipts yet."
          onRowClick={(l) => (window.location.href = `/lorry-receipts/${l._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title="Create Lorry Receipt" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Route & Goods</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From Location">
                <TextInput
                  required
                  value={form.fromLocation}
                  onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
                  placeholder="Pune"
                />
              </Field>
              <Field label="To Location">
                <TextInput
                  required
                  value={form.toLocation}
                  onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
                  placeholder="Nashik"
                />
              </Field>
              <Field label="Goods Description">
                <TextInput
                  value={form.goodsDescription}
                  onChange={(e) => setForm({ ...form, goodsDescription: e.target.value })}
                />
              </Field>
              <Field label="Truck Size (ft)">
                <Select value={form.truckSizeFt} onChange={(e) => setForm({ ...form, truckSizeFt: e.target.value })}>
                  <option value="">—</option>
                  {TRUCK_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} ft
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Consignor</h3>
              <button
                type="button"
                onClick={useMeAsConsignor}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Same as me
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <TextInput
                  required
                  value={form.consignorName}
                  onChange={(e) => setForm({ ...form, consignorName: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <TextInput
                  value={form.consignorAddress}
                  onChange={(e) => setForm({ ...form, consignorAddress: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Consignee</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <TextInput
                  required
                  value={form.consigneeName}
                  onChange={(e) => setForm({ ...form, consigneeName: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <TextInput
                  value={form.consigneeAddress}
                  onChange={(e) => setForm({ ...form, consigneeAddress: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
