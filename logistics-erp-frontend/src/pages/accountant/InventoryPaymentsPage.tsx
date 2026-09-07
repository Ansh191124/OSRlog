import { useState } from "react";
import { inventoryPurchaseApi, uploadApi } from "../../api/entities";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// Accountant: pending inventory purchase requests — pay (uploading your own
// proof) to both settle it and add the quantity to stock, or reject it.
export function InventoryPaymentsPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fileByPurchase, setFileByPurchase] = useState<Record<string, File | null>>({});
  const { data: purchases, isLoading, error, reload } = useApiData(async () => {
    const all = await inventoryPurchaseApi.list();
    return all.filter((p) => p.status === "pending_payment");
  });

  async function handlePay(id: string) {
    setBusyId(id);
    try {
      let proofUrl: string | undefined;
      const file = fileByPurchase[id];
      if (file) {
        const uploaded = await uploadApi.uploadProof(file);
        proofUrl = uploaded.key;
      }
      await inventoryPurchaseApi.pay(id, proofUrl);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Reason for rejecting this purchase request?") || undefined;
    setBusyId(id);
    try {
      await inventoryPurchaseApi.reject(id, reason);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Inventory Payments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Pending inventory purchase requests. Paying updates the ledger and adds the quantity to stock.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-4 space-y-2">
          {(purchases ?? []).length === 0 && <p className="text-sm text-text-secondary">Nothing to pay right now.</p>}
          {(purchases ?? []).map((p) => (
            <div key={p._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {p.requestedBy?.name} — {p.itemName}
                </p>
                <p className="text-xs text-text-secondary">
                  {p.quantity} {p.unit || ""} • ₹{p.amount.toLocaleString()} •{" "}
                  <Badge tone="neutral">{p.paymentMethod}</Badge>
                  {p.notes ? ` • ${p.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  className="text-xs"
                  onChange={(e) => setFileByPurchase({ ...fileByPurchase, [p._id]: e.target.files?.[0] || null })}
                />
                <Button variant="secondary" disabled={busyId === p._id} onClick={() => handleReject(p._id)}>
                  Reject
                </Button>
                <Button disabled={busyId === p._id} onClick={() => handlePay(p._id)}>
                  {busyId === p._id ? "Paying..." : "Pay"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
