import { useState, type FormEvent } from "react";
import { ledgerApi, uploadApi } from "../../api/entities";
import type { LedgerEntry } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function LedgerBookPage({ mode, title }: { mode: "cash" | "online"; title: string }) {
  const { data: entries, isLoading, error: loadError, reload } = useApiData(() => ledgerApi.list(mode), [mode]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ direction: "received" as "received" | "sent", amount: "0", party: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setForm({ direction: "received", amount: "0", party: "", description: "" });
    setFile(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      let proofUrl: string | undefined;
      if (file) {
        const uploaded = await uploadApi.uploadProof(file);
        proofUrl = uploaded.key;
      }
      await ledgerApi.create({
        mode,
        direction: form.direction,
        amount: Number(form.amount) || 0,
        party: form.party,
        description: form.description,
        proofUrl,
      });
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<LedgerEntry>[] = [
    { header: "Direction", render: (e) => <Badge tone={e.direction === "received" ? "success" : "warning"}>{e.direction}</Badge> },
    { header: "Amount", render: (e) => `₹${e.amount.toLocaleString()}` },
    { header: "Party", render: (e) => e.party || "—" },
    {
      header: "Description",
      render: (e) =>
        e.description ||
        e.relatedPayment?.reason ||
        (e.relatedLoadingSlip ? `Loading Slip #${e.relatedLoadingSlip.slipNumber}` : null) ||
        (e.relatedInventoryPurchase ? `Inventory — ${e.relatedInventoryPurchase.itemName}` : "—"),
    },
    { header: "Date", render: (e) => new Date(e.date).toLocaleDateString() },
    { header: "Proof", render: (e) => (e.proofUrl ? "Attached" : "—") },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">Your recorded {mode} transactions.</p>
        </div>
        <Button onClick={openCreate}>Add Entry</Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table columns={columns} rows={entries ?? []} emptyMessage="No entries yet." />
      </AsyncState>

      <Modal open={modalOpen} title={`Add ${title} Entry`} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Direction">
            <Select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as "received" | "sent" })}
            >
              <option value="received">Received</option>
              <option value="sent">Sent</option>
            </Select>
          </Field>
          <Field label="Amount">
            <TextInput
              type="number"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Party">
            <TextInput
              value={form.party}
              onChange={(e) => setForm({ ...form, party: e.target.value })}
              placeholder="Who money came from / went to"
            />
          </Field>
          <Field label="Description">
            <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Proof (optional)">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
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
    </div>
  );
}
