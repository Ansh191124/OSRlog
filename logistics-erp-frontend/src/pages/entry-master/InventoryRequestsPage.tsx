import { useState, type FormEvent } from "react";
import { inventoryPurchaseApi } from "../../api/entities";
import { PAYMENT_METHODS, type PaymentMethod, type InventoryPurchase } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<InventoryPurchase["status"], "success" | "warning" | "danger"> = {
  pending_payment: "warning",
  paid: "success",
  rejected: "danger",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

const emptyForm = {
  itemName: "",
  quantity: "1",
  unit: "",
  amount: "0",
  paymentMethod: "cash" as PaymentMethod,
  notes: "",
};

// Entry Master/Co-Admin/Admin: request an inventory purchase (item, quantity,
// cost) — goes straight to the Accountant to pay. Once paid, the quantity is
// added to that item's stock automatically (see InventoryPage).
export function InventoryRequestsPage() {
  const { data: purchases, isLoading, error: loadError, reload } = useApiData(() => inventoryPurchaseApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await inventoryPurchaseApi.create({
        itemName: form.itemName,
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        amount: Number(form.amount) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<InventoryPurchase>[] = [
    { header: "Item", render: (p) => <span className="font-medium">{p.itemName}</span> },
    { header: "Quantity", render: (p) => `${p.quantity} ${p.unit || ""}`.trim() },
    { header: "Amount", render: (p) => `₹${p.amount.toLocaleString()}` },
    { header: "Requested By", render: (p) => p.requestedBy?.name || "—" },
    { header: "Status", render: (p) => <Badge tone={statusTone[p.status]}>{p.status.replace(/_/g, " ")}</Badge> },
    { header: "Date", render: (p) => new Date(p.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inventory Requests</h1>
          <p className="text-sm text-text-secondary">
            Request a purchase — it goes to the Accountant to pay, then adds to stock automatically.
          </p>
        </div>
        <Button onClick={openCreate}>New Purchase Request</Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table columns={columns} rows={purchases ?? []} emptyMessage="No inventory requests yet." />
      </AsyncState>

      <Modal open={modalOpen} title="Request Inventory Purchase" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Item Name">
            <TextInput
              required
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="Tyres, Engine Oil, Spare Parts..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <TextInput
                type="number"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="Unit">
              <TextInput
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pcs, boxes, liters..."
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (Cost)">
              <TextInput
                type="number"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
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
          <Field label="Notes">
            <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Requesting..." : "Request"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
