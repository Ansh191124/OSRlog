import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { lorryReceiptApi, loadingSlipApi } from "../../api/entities";
import { PAYMENT_METHODS, type PaymentMethod } from "../../types/entities";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

// Co-Admin/Admin: dedicated page (not a modal, per the "if it doesn't fit, make it
// a page" rule) for setting the commercial terms of an approved LR before it's
// sent to the client for review and payment.
export function CreateLoadingSlipPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lorryReceiptId = params.get("lorryReceiptId") || "";
  const { data: lr, isLoading, error: loadError } = useApiData(() => lorryReceiptApi.get(lorryReceiptId), [lorryReceiptId]);

  const [form, setForm] = useState({
    freightRate: "0",
    otherCharges: "0",
    advance: "0",
    paymentMode: "consignor_pays" as "consignor_pays" | "consignee_pays",
    paymentMethod: "cash" as PaymentMethod,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const slip = await loadingSlipApi.create({
        lorryReceiptId,
        freightRate: Number(form.freightRate) || 0,
        otherCharges: Number(form.otherCharges) || 0,
        advance: Number(form.advance) || 0,
        paymentMode: form.paymentMode,
        paymentMethod: form.paymentMethod,
      });
      navigate(`/loading-slips/${slip._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
      setIsSaving(false);
    }
  }

  const totalAmount = (Number(form.freightRate) || 0) + (Number(form.otherCharges) || 0);
  const balance = totalAmount - (Number(form.advance) || 0);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 text-sm font-medium text-text-secondary hover:text-text-primary">
        ← Back
      </button>
      <h1 className="text-xl font-semibold text-text-primary">Create Loading Slip</h1>
      <p className="mt-1 text-sm text-text-secondary">Set the freight and payment terms, then send it to the client.</p>

      <AsyncState isLoading={isLoading} error={loadError}>
        {!lr ? (
          <p className="mt-6 text-sm text-text-secondary">Lorry Receipt not found.</p>
        ) : (
          <div className="mt-6 max-w-2xl space-y-5 rounded-xl border border-border bg-surface p-6">
            <div className="rounded-lg bg-surface-muted p-4 text-sm">
              <p className="font-medium text-text-primary">
                LR #{lr.lrNumber} — {lr.client ? lr.client.companyName || lr.client.name : "Temporary / Walk-in Job"}
              </p>
              <p className="mt-1 text-text-secondary">
                {lr.fromLocation} -&gt; {lr.toLocation} · Consignee: {lr.consignee?.name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Freight Rate">
                  <TextInput
                    type="number"
                    value={form.freightRate}
                    onChange={(e) => setForm({ ...form, freightRate: e.target.value })}
                  />
                </Field>
                <Field label="Other Charges">
                  <TextInput
                    type="number"
                    value={form.otherCharges}
                    onChange={(e) => setForm({ ...form, otherCharges: e.target.value })}
                  />
                </Field>
                <Field label="Advance">
                  <TextInput
                    type="number"
                    value={form.advance}
                    onChange={(e) => setForm({ ...form, advance: e.target.value })}
                  />
                </Field>
              </div>

              <p className="text-xs text-text-secondary">
                Total Amount (auto): ₹{totalAmount.toLocaleString()} · Balance / To Pay (auto): ₹{balance.toLocaleString()}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Mode">
                  <Select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value as any })}
                  >
                    <option value="consignor_pays">Consignor Pays</option>
                    <option value="consignee_pays">Consignee Pays</option>
                  </Select>
                </Field>
                <Field label="Payment Method">
                  <Select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {error && <p className="text-sm text-danger-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Sending..." : "Send to Client"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </AsyncState>
    </div>
  );
}
