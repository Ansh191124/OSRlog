import { useState, type FormEvent } from "react";
import { clientApi, lorryReceiptApi } from "../../api/entities";
import type { LorryReceipt } from "../../types/entities";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useApiData } from "../../hooks/useApiData";

const TRUCK_SIZES = [14, 17, 19, 22, 24, 32, 34];

const emptyForm = {
  clientId: "",
  fromLocation: "",
  toLocation: "",
  goodsDescription: "",
  truckSizeFt: "",
  consignorName: "",
  consignorAddress: "",
  consigneeName: "",
  consigneeAddress: "",
};

// "Co-Admin -> Trip -> Can Create Trips (Like the Trip sheet we have) & print."
// Per the doc's workflow ("Via Employee or Co-admin -> Same as client"), this
// submits an LR + trip detail request on the client's behalf. Since Co-Admin
// already holds approval authority, it's auto-approved. Freight/payment terms
// are set separately once approved, via the Loading Slip flow.
export function CreateTripPage() {
  const { data: clients, error: clientsError, reload: reloadClients } = useApiData(() => clientApi.list());
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<LorryReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function useClientAsConsignor() {
    const client = (clients ?? []).find((c) => c._id === form.clientId);
    if (!client) return;
    setForm({ ...form, consignorName: client.companyName || client.name, consignorAddress: client.address || "" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const lorryReceipt = await lorryReceiptApi.create({
        clientId: form.clientId,
        fromLocation: form.fromLocation,
        toLocation: form.toLocation,
        goodsDescription: form.goodsDescription,
        truckSizeFt: form.truckSizeFt ? Number(form.truckSizeFt) : null,
        consignor: { name: form.consignorName, address: form.consignorAddress },
        consignee: { name: form.consigneeName, address: form.consigneeAddress },
      });
      setCreated(lorryReceipt);
      setForm(emptyForm);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Create Trip</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Submit a Lorry Receipt on a client's behalf — auto-approved. Freight and payment terms are set
        afterward via the Loading Slip.
      </p>

      {created && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>
            LR #{created.lrNumber} created and approved for {created.client?.name || "the client"}.
          </span>
          <button
            onClick={() => lorryReceiptApi.downloadPdf(created._id, created.lrNumber)}
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Download PDF
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-border bg-surface p-6">
        <Field label="Client">
          <Select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client</option>
            {(clients ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.companyName ? `(${c.companyName})` : ""}
              </option>
            ))}
          </Select>
          {clientsError && (
            <p className="mt-1 text-xs text-danger-600">
              {clientsError}{" "}
              <button type="button" onClick={reloadClients} className="underline hover:no-underline">
                Retry
              </button>
            </p>
          )}
        </Field>

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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Consignor</h3>
            <button
              type="button"
              onClick={useClientAsConsignor}
              disabled={!form.clientId}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
            >
              Same as client
            </button>
          </div>
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

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create Trip"}
        </Button>
      </form>
    </div>
  );
}
