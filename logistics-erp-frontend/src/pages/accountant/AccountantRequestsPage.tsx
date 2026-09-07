import { useState } from "react";
import { paymentApi, uploadApi } from "../../api/entities";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// "Requests -> Of Payments from Vehicle Master & everything." — the queue of
// Vehicle-Master-approved expense requests ready for the accountant to pay.
export function AccountantRequestsPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fileByPayment, setFileByPayment] = useState<Record<string, File | null>>({});
  const { data: payments, isLoading, error, reload } = useApiData(async () => {
    const all = await paymentApi.list();
    return all.filter((p) => p.status === "approved_by_vehicle_master");
  });

  async function handlePay(id: string) {
    setBusyId(id);
    try {
      let proofUrl: string | undefined;
      const file = fileByPayment[id];
      if (file) {
        const uploaded = await uploadApi.uploadProof(file);
        proofUrl = uploaded.key;
      }
      await paymentApi.pay(id, proofUrl);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Requests</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Approved driver expense requests ready to pay. Paying updates the ledger automatically.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-4 space-y-2">
          {(payments ?? []).length === 0 && <p className="text-sm text-text-secondary">Nothing to pay right now.</p>}
          {(payments ?? []).map((p) => (
            <div key={p._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {p.requestedBy.name} — {p.reason}
                </p>
                <p className="text-xs text-text-secondary">
                  ₹{p.amount.toLocaleString()} • <Badge tone="neutral">{p.mode}</Badge> • approved by{" "}
                  {p.vehicleMasterApprovedBy?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/payments/${p._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View
                </a>
                <input
                  type="file"
                  className="text-xs"
                  onChange={(e) => setFileByPayment({ ...fileByPayment, [p._id]: e.target.files?.[0] || null })}
                />
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
