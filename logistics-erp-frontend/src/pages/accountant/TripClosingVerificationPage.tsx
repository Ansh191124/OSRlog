import { useState } from "react";
import { tripApi } from "../../api/entities";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// Accountant: confirm whether the Vehicle Master's reported closing payment
// (what the client paid at delivery, for a trip's leftover Loading Slip
// balance) actually reflects a real, received payment. Verifying settles it
// against the trip's Loading Slip(s) and closes the trip.
export function TripClosingVerificationPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: trips, isLoading, error, reload } = useApiData(async () => {
    const all = await tripApi.list();
    return all.filter((t) => t.closurePayment?.status === "pending_verification");
  });

  async function handleVerify(id: string, decision: "verified" | "rejected") {
    setBusyId(id);
    try {
      if (decision === "rejected") {
        const reason = window.prompt("Reason for rejecting this payment?") || "Payment could not be verified";
        await tripApi.verifyClosingPayment(id, "rejected", reason);
      } else {
        await tripApi.verifyClosingPayment(id, "verified");
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Trip Closing Payments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Confirm whether the Vehicle Master's reported closing payment reflects a real, received payment.
      </p>

      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="mt-4 space-y-2">
          {(trips ?? []).length === 0 && <p className="text-sm text-text-secondary">Nothing pending.</p>}
          {(trips ?? []).map((t) => (
            <div key={t._id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {t.vehicle.registrationNumber} — {t.fromLocation} -&gt; {t.toLocation}
                </p>
                <p className="text-xs text-text-secondary">
                  Amount ₹{t.closurePayment?.amount.toLocaleString()} · submitted{" "}
                  {t.closurePayment?.submittedAt ? new Date(t.closurePayment.submittedAt).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {t.closurePayment?.proofSignedUrl ? (
                  <a
                    href={t.closurePayment.proofSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    View Proof
                  </a>
                ) : t.closurePayment?.proofUrl ? (
                  <Badge tone="neutral">Proof attached</Badge>
                ) : (
                  <Badge tone="warning">Cash — no proof</Badge>
                )}
                <Button variant="secondary" disabled={busyId === t._id} onClick={() => handleVerify(t._id, "rejected")}>
                  Reject
                </Button>
                <Button disabled={busyId === t._id} onClick={() => handleVerify(t._id, "verified")}>
                  {busyId === t._id ? "Saving..." : "Verify"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
