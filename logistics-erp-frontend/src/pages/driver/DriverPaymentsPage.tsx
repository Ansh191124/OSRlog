import { useState, type FormEvent } from "react";
import { paymentApi } from "../../api/entities";
import type { Payment } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<Payment["status"], "warning" | "brand" | "danger" | "success"> = {
  pending_vehicle_master: "warning",
  approved_by_vehicle_master: "brand",
  rejected: "danger",
  paid: "success",
};

const statusLabel: Record<Payment["status"], string> = {
  pending_vehicle_master: "Pending Vehicle Master",
  approved_by_vehicle_master: "Approved — awaiting payment",
  rejected: "Rejected",
  paid: "Paid",
};

export function DriverPaymentsPage() {
  const { data: payments, isLoading, error: loadError, reload } = useApiData(() => paymentApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ reason: "", amount: "0", mode: "cash" as "cash" | "online" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setForm({ reason: "", amount: "0", mode: "cash" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await paymentApi.create({ reason: form.reason, amount: Number(form.amount) || 0, mode: form.mode });
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<Payment>[] = [
    { header: "Reason", render: (p) => p.reason },
    { header: "Amount", render: (p) => `₹${p.amount.toLocaleString()}` },
    { header: "Mode", render: (p) => p.mode },
    { header: "Status", render: (p) => <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge> },
    { header: "Requested On", render: (p) => new Date(p.createdAt).toLocaleDateString() },
    {
      header: "",
      render: (p) => (
        <a href={`/payments/${p._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Payment Requests</h1>
          <p className="text-sm text-text-secondary">Request payment for trip expenses.</p>
        </div>
        <Button onClick={openCreate}>New Request</Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={payments ?? []}
          emptyMessage="No payment requests yet."
          onRowClick={(p) => (window.location.href = `/payments/${p._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title="Request Payment" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Reason">
            <TextInput
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Diesel top-up, toll, repair..."
            />
          </Field>
          <Field label="Amount">
            <TextInput
              type="number"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Mode">
            <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as "cash" | "online" })}>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </Select>
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
