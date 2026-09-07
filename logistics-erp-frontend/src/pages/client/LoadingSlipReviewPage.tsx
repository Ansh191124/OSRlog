import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadingSlipApi, uploadApi } from "../../api/entities";
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

// Client: review the Co-Admin-set freight/payment terms, pay outside the
// system, then upload a screenshot as proof and approve — sends it to the
// Accountant for verification.
export function LoadingSlipReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: slip, isLoading, error: loadError, reload, setData } = useApiData(() => loadingSlipApi.get(id!), [id]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = slip && ["awaiting_payment", "payment_rejected"].includes(slip.status);
  const isCash = slip?.paymentMethod === "cash";

  async function handleApprove() {
    if (!slip) return;
    if (!isCash && !file) return;
    setError(null);
    setIsSaving(true);
    try {
      let proofUrl: string | undefined;
      if (file) {
        const uploaded = await uploadApi.uploadProof(file);
        proofUrl = uploaded.key;
      }
      const updated = await loadingSlipApi.submitPayment(slip._id, proofUrl);
      setData(updated);
      setFile(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 text-sm font-medium text-text-secondary hover:text-text-primary">
        ← Back
      </button>
      <h1 className="text-xl font-semibold text-text-primary">Loading Slip Review</h1>
      <p className="mt-1 text-sm text-text-secondary">Review the terms, pay, then upload proof and approve.</p>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        {!slip ? (
          <p className="mt-6 text-sm text-text-secondary">Loading Slip not found.</p>
        ) : (
          <div className="mt-6 max-w-2xl space-y-5 rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">
                Slip #{slip.slipNumber} — LR #{slip.lorryReceipt?.lrNumber}
              </p>
              <Badge tone={statusTone[slip.status]}>{slip.status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-sm text-text-secondary">
              {slip.lorryReceipt?.fromLocation} -&gt; {slip.lorryReceipt?.toLocation}
            </p>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Freight Rate</p>
                <p className="mt-0.5 font-medium text-text-primary">₹{slip.freightRate.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Other Charges</p>
                <p className="mt-0.5 font-medium text-text-primary">₹{slip.otherCharges.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Advance</p>
                <p className="mt-0.5 font-medium text-text-primary">₹{slip.advance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Balance (To Pay)</p>
                <p className="mt-0.5 font-semibold text-text-primary">₹{slip.balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">Payment Method</p>
                <p className="mt-0.5 font-medium text-text-primary">{PAYMENT_METHOD_LABELS[slip.paymentMethod]}</p>
              </div>
            </div>

            {slip.status === "payment_rejected" && slip.rejectionReason && (
              <div className="rounded-lg border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-600">
                Payment was rejected: {slip.rejectionReason}. Please resubmit.
              </div>
            )}

            {canSubmit ? (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-text-primary">
                  Pay ₹{slip.advance.toLocaleString()} via {PAYMENT_METHOD_LABELS[slip.paymentMethod]}
                  {isCash ? ", then confirm below." : ", then upload a screenshot as proof."}
                </p>
                {!isCash && (
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                )}
                {error && <p className="text-sm text-danger-600">{error}</p>}
                <div className="flex justify-end">
                  <Button disabled={(!isCash && !file) || isSaving} onClick={handleApprove}>
                    {isSaving ? "Submitting..." : isCash ? "Confirm Cash Payment" : "Approve & Submit Payment"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4 text-sm text-text-secondary">
                {slip.status === "payment_submitted" && "Awaiting Accountant verification."}
                {slip.status === "verified" && "Payment verified — your trip will be arranged shortly."}
              </div>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
