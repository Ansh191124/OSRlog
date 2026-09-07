import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { lorryReceiptApi, loadingSlipApi, uploadApi } from "../../api/entities";
import { PAYMENT_METHODS, type PaymentMethod } from "../../types/entities";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const TRUCK_SIZES = [14, 17, 19, 22, 24, 32, 34];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

const emptyForm = {
  fromLocation: "",
  toLocation: "",
  goodsDescription: "",
  truckSizeFt: "",
  consignorName: "",
  consignorAddress: "",
  consigneeName: "",
  consigneeAddress: "",
  freightRate: "0",
  otherCharges: "0",
  advance: "0",
  paymentMode: "consignor_pays" as "consignor_pays" | "consignee_pays",
  paymentMethod: "cash" as PaymentMethod,
};

// Co-Admin/Admin: a one-off/walk-in job with no client account — no
// reservation quota required, it just takes the next LR number in the normal
// series. Since there's no client to review and pay, Co-Admin fills the
// freight/payment terms AND submits the payment proof directly; it goes
// straight to the Accountant for verification, then to the Vehicle Master
// for trip management exactly like any other verified LR.
export function CreateTemporaryTripPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalAmount = (Number(form.freightRate) || 0) + (Number(form.otherCharges) || 0);
  const balance = totalAmount - (Number(form.advance) || 0);
  const isCash = form.paymentMethod === "cash";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isCash && !file) {
      setError("Payment proof is required.");
      return;
    }
    setIsSaving(true);
    try {
      const lorryReceipt = await lorryReceiptApi.create({
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        goodsDescription: form.goodsDescription,
        truckSizeFt: form.truckSizeFt ? Number(form.truckSizeFt) : null,
        consignor: { name: form.consignorName, address: form.consignorAddress },
        consignee: { name: form.consigneeName, address: form.consigneeAddress },
        isTemporary: true,
      });

      const loadingSlip = await loadingSlipApi.create({
        lorryReceiptId: lorryReceipt._id,
        freightRate: Number(form.freightRate) || 0,
        otherCharges: Number(form.otherCharges) || 0,
        advance: Number(form.advance) || 0,
        paymentMode: form.paymentMode,
        paymentMethod: form.paymentMethod,
      });

      let proofUrl: string | undefined;
      if (file) {
        const uploaded = await uploadApi.uploadProof(file);
        proofUrl = uploaded.key;
      }
      await loadingSlipApi.submitPayment(loadingSlip._id, proofUrl);

      navigate(`/loading-slips/${loadingSlip._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Create Temporary Trip</h1>
      <p className="mt-1 text-sm text-text-secondary">
        For a one-off / walk-in job with no client account — no reservation required. Fill everything here,
        including proof of payment; it goes straight to the Accountant for verification.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-border bg-surface p-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Route & Goods</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From Location">
              <TextInput
                required
                value={form.fromLocation}
                onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
              />
            </Field>
            <Field label="To Location">
              <TextInput
                required
                value={form.toLocation}
                onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
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
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Consignor</h3>
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

        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Freight & Payment</h3>
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
          <p className="mt-2 text-xs text-text-secondary">
            Total Amount (auto): ₹{totalAmount.toLocaleString()} · Balance / To Pay (auto): ₹{balance.toLocaleString()}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
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

          {!isCash && (
            <Field label="Payment Proof" className="mt-3">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
            </Field>
          )}
        </div>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create & Send for Verification"}
        </Button>
      </form>
    </div>
  );
}
