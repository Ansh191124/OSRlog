import { useState, type FormEvent } from "react";
import { inventoryApi } from "../../api/entities";
import type { InventoryItem } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import { useApp } from "../../context/AppContext";

// Shown to Admin/Co-Admin (manual stock add/edit + usage) and Entry Master
// (view + record usage only — their path to add stock is the paid
// procurement request flow, see InventoryRequestsPage).
export function InventoryPage() {
  const { scope } = useApp();
  const canManage = scope === "admin" || scope === "co_admin";
  const { data: items, isLoading, error: loadError, reload } = useApiData(() => inventoryApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ name: "", quantity: "0", unit: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [usageTarget, setUsageTarget] = useState<InventoryItem | null>(null);
  const [usageForm, setUsageForm] = useState({ quantityUsed: "0", note: "" });
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isRecordingUsage, setIsRecordingUsage] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", quantity: "0", unit: "", notes: "" });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit || "", notes: item.notes || "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = { name: form.name, quantity: Number(form.quantity) || 0, unit: form.unit, notes: form.notes };
      if (editing) {
        await inventoryApi.update(editing._id, payload);
      } else {
        await inventoryApi.create(payload);
      }
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  function openUsage(item: InventoryItem) {
    setUsageTarget(item);
    setUsageForm({ quantityUsed: "0", note: "" });
    setUsageError(null);
  }

  async function handleUsageSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usageTarget) return;
    setUsageError(null);
    setIsRecordingUsage(true);
    try {
      await inventoryApi.recordUsage(usageTarget._id, Number(usageForm.quantityUsed) || 0, usageForm.note);
      setUsageTarget(null);
      await reload();
    } catch (err: any) {
      setUsageError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsRecordingUsage(false);
    }
  }

  const columns: Column<InventoryItem>[] = [
    { header: "Item", render: (i) => <span className="font-medium">{i.name}</span> },
    { header: "In Stock (Left)", render: (i) => `${i.quantity} ${i.unit || ""}`.trim() },
    { header: "Total Received", render: (i) => `${i.totalReceived} ${i.unit || ""}`.trim() },
    { header: "Total Used", render: (i) => `${i.totalUsed} ${i.unit || ""}`.trim() },
    { header: "Notes", render: (i) => i.notes || "—" },
    {
      header: "",
      render: (i) => (
        <div className="flex gap-3">
          <a href={`/inventory/${i._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button onClick={() => openUsage(i)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Record Usage
          </button>
          {canManage && (
            <button onClick={() => openEdit(i)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Edit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inventory</h1>
          <p className="text-sm text-text-secondary">Stock on hand, and what's been received and used.</p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Item</Button>}
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={items ?? []}
          emptyMessage="No inventory items yet."
          onRowClick={(i) => (window.location.href = `/inventory/${i._id}`)}
        />
      </AsyncState>

      {canManage && (
        <Modal open={modalOpen} title={editing ? "Edit Item" : "Add Item"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Item Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <TextInput
                type="number"
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
            <Field label="Notes">
              <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Modal open={Boolean(usageTarget)} title={`Record Usage — ${usageTarget?.name}`} onClose={() => setUsageTarget(null)}>
        <form onSubmit={handleUsageSubmit} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Currently in stock: {usageTarget?.quantity} {usageTarget?.unit || ""}
          </p>
          <Field label="Quantity Used">
            <TextInput
              type="number"
              required
              value={usageForm.quantityUsed}
              onChange={(e) => setUsageForm({ ...usageForm, quantityUsed: e.target.value })}
            />
          </Field>
          <Field label="Note">
            <TextInput
              value={usageForm.note}
              onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
              placeholder="Used for trip #, maintenance, etc."
            />
          </Field>

          {usageError && <p className="text-sm text-danger-600">{usageError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setUsageTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isRecordingUsage}>
              {isRecordingUsage ? "Saving..." : "Record Usage"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
