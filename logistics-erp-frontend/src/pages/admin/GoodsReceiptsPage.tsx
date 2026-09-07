import { useState } from "react";
import { clientApi, goodsReceiptApi } from "../../api/entities";
import type { GoodsReceipt, LorryReceipt } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function GoodsReceiptsPage() {
  const { data: goodsReceipts, isLoading, error, reload } = useApiData(() => goodsReceiptApi.list());
  const { data: clients } = useApiData(() => clientApi.list());

  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [preview, setPreview] = useState<{ client: { name: string; companyName?: string }; lorryReceipts: LorryReceipt[] } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openModal() {
    setClientId("");
    setPreview(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleClientChange(id: string) {
    setClientId(id);
    setPreview(null);
    setFormError(null);
    if (!id) return;
    setIsPreviewing(true);
    try {
      const result = await goodsReceiptApi.previewEligible(id);
      setPreview(result);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Could not load eligible LRs.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleGenerate() {
    if (!clientId) return;
    setIsGenerating(true);
    setFormError(null);
    try {
      await goodsReceiptApi.generate(clientId);
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  const columns: Column<GoodsReceipt>[] = [
    { header: "GR No.", render: (g) => <span className="font-medium">{g.grNumber}</span> },
    { header: "Client", render: (g) => g.client?.companyName || g.client?.name || "—" },
    { header: "LRs Bundled", render: (g) => g.lorryReceipts?.length ?? 0 },
    {
      header: "Total Value",
      render: (g) =>
        `₹${(g.lorryReceipts ?? []).reduce((sum, lr) => sum + (lr.loadingSlip?.totalAmount || 0), 0).toLocaleString()}`,
    },
    { header: "Issued By", render: (g) => g.issuedBy?.name || "—" },
    { header: "Date", render: (g) => new Date(g.createdAt).toLocaleDateString() },
    {
      header: "",
      render: (g) => (
        <div className="flex gap-3">
          <a href={`/goods-receipts/${g._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button
            onClick={() => goodsReceiptApi.downloadPdf(g._id, g.grNumber)}
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
          <h1 className="text-xl font-semibold text-text-primary">Goods Receipt</h1>
          <p className="mt-1 text-sm text-text-secondary">
            A GR bundles all of a client's delivered LRs that haven't yet been included in an earlier GR.
          </p>
        </div>
        <Button onClick={openModal}>Generate GR</Button>
      </div>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <Table
          columns={columns}
          rows={goodsReceipts ?? []}
          emptyMessage="No Goods Receipts yet."
          onRowClick={(g) => (window.location.href = `/goods-receipts/${g._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title="Generate Goods Receipt" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Field label="Client">
            <Select value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
              <option value="">Select client</option>
              {(clients ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          {isPreviewing && <p className="text-sm text-text-secondary">Loading eligible LRs...</p>}

          {preview && (
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">
                {preview.lorryReceipts.length} LR{preview.lorryReceipts.length === 1 ? "" : "s"} eligible for {preview.client.companyName || preview.client.name}
              </p>
              {preview.lorryReceipts.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  This client has no delivered LRs awaiting a Goods Receipt.
                </p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
                  {preview.lorryReceipts.map((lr) => (
                    <li key={lr._id} className="flex justify-between border-b border-border py-1 last:border-0">
                      <span>
                        LR #{lr.lrNumber} — {lr.fromLocation} -&gt; {lr.toLocation}
                      </span>
                      <span className="font-medium">₹{(lr.loadingSlip?.totalAmount || 0).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {formError && <p className="text-sm text-danger-600">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!clientId || !preview || preview.lorryReceipts.length === 0 || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
