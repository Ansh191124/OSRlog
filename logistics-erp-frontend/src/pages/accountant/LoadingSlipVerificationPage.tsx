import { useState } from "react";
import { loadingSlipApi } from "../../api/entities";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// Accountant: "Requests -> Of Payments ... & everything" extended to Loading
// Slip payments — confirm whether a client's submitted proof reflects a real,
// received payment. Verifying unlocks the LR for vehicle assignment.
export function LoadingSlipVerificationPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: loadingSlips, isLoading, error, reload } = useApiData(async () => {
    const all = await loadingSlipApi.list();
    return all.filter((s) => s.status === "payment_submitted");
  });

  async function handleVerify(id: string, decision: "verified" | "rejected") {
    setBusyId(id);
    try {
      if (decision === "rejected") {
        const reason = window.prompt("Reason for rejecting this payment?") || "Payment could not be verified";
        await loadingSlipApi.verify(id, "rejected", reason);
      } else {
        await loadingSlipApi.verify(id, "verified");
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Loading Slip Verification</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Confirm whether the client's submitted payment proof reflects a real, received payment.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-4 space-y-2">
          {(loadingSlips ?? []).length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
          {(loadingSlips ?? []).map((s) => (
            <div key={s._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Slip #{s.slipNumber} — {s.client?.companyName || s.client?.name}
                </p>
                <p className="text-xs text-text-secondary">
                  LR #{s.lorryReceipt?.lrNumber} · Balance ₹{s.balance.toLocaleString()} · submitted{" "}
                  {s.clientSubmittedAt ? new Date(s.clientSubmittedAt).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {s.paymentProofSignedUrl ? (
                  <a href={s.paymentProofSignedUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View Proof
                  </a>
                ) : s.paymentProofUrl ? (
                  <Badge tone="neutral">Proof attached</Badge>
                ) : (
                  <Badge tone="warning">Cash — no proof</Badge>
                )}
                <Button variant="secondary" disabled={busyId === s._id} onClick={() => handleVerify(s._id, "rejected")}>
                  Reject
                </Button>
                <Button disabled={busyId === s._id} onClick={() => handleVerify(s._id, "verified")}>
                  {busyId === s._id ? "Saving..." : "Verify"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
