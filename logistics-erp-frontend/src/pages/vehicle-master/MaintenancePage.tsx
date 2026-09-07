import { useState, type FormEvent } from "react";
import { maintenanceApi, vehicleApi } from "../../api/entities";
import type { VehicleMaintenanceRecord } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function MaintenancePage() {
  const { data, isLoading, error: loadError, reload } = useApiData(async () => {
    const [records, vehicles] = await Promise.all([maintenanceApi.list(), vehicleApi.list()]);
    return { records, vehicles };
  });
  const records = data?.records ?? [];
  const vehicles = data?.vehicles ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", description: "", cost: "0", date: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setForm({ vehicleId: vehicles[0]?._id || "", description: "", cost: "0", date: "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await maintenanceApi.create({
        vehicleId: form.vehicleId,
        description: form.description,
        cost: Number(form.cost) || 0,
        date: form.date || undefined,
      });
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<VehicleMaintenanceRecord>[] = [
    { header: "Vehicle", render: (r) => <span className="font-medium">{r.vehicle.registrationNumber}</span> },
    { header: "Description", render: (r) => r.description },
    { header: "Cost", render: (r) => `₹${r.cost.toLocaleString()}` },
    { header: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
    { header: "Recorded By", render: (r) => r.recordedBy?.name || "—" },
    {
      header: "",
      render: (r) => (
        <a href={`/maintenance/${r._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Vehicle Maintenance</h1>
          <p className="text-sm text-text-secondary">Maintenance records for your assigned vehicles.</p>
        </div>
        <Button onClick={openCreate} disabled={vehicles.length === 0}>
          Add Record
        </Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={records}
          emptyMessage="No maintenance records yet."
          onRowClick={(r) => (window.location.href = `/maintenance/${r._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title="Add Maintenance Record" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Vehicle">
            <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <TextInput
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Oil change, tyre replacement..."
            />
          </Field>
          <Field label="Cost">
            <TextInput type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
          <Field label="Date">
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
