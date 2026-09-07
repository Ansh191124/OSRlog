import { useState, type FormEvent } from "react";
import { vehicleApi, uploadApi } from "../../api/entities";
import type { Vehicle } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<Vehicle["status"], "success" | "brand" | "warning" | "neutral"> = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
};

const emptyForm = {
  registrationNumber: "",
  type: "",
  capacity: "",
  baseLocation: "",
  rcNumber: "",
  ownershipType: "company" as "company" | "third_party",
  ownerName: "",
  odometerReading: "0",
  tyreCount: "",
  vehicleDimension: "",
};

export function VehiclesPage() {
  const { data: vehicles, isLoading, error: loadError, reload } = useApiData(() => vehicleApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [rcPhoto, setRcPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setRcPhoto(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setForm({
      registrationNumber: vehicle.registrationNumber,
      type: vehicle.type || "",
      capacity: vehicle.capacity || "",
      baseLocation: vehicle.baseLocation || "",
      rcNumber: vehicle.rcNumber || "",
      ownershipType: vehicle.ownershipType || "company",
      ownerName: vehicle.ownerName || "",
      odometerReading: String(vehicle.odometerReading || 0),
      tyreCount: vehicle.tyreCount ? String(vehicle.tyreCount) : "",
      vehicleDimension: vehicle.vehicleDimension || "",
    });
    setRcPhoto(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      let rcPhotoKey: string | undefined;
      if (rcPhoto) {
        const uploaded = await uploadApi.uploadProof(rcPhoto);
        rcPhotoKey = uploaded.key;
      }
      const payload: Partial<Vehicle> = {
        registrationNumber: form.registrationNumber,
        type: form.type,
        capacity: form.capacity,
        baseLocation: form.baseLocation,
        rcNumber: form.rcNumber,
        ownershipType: form.ownershipType,
        ownerName: form.ownershipType === "company" ? form.ownerName : undefined,
        odometerReading: Number(form.odometerReading) || 0,
        tyreCount: form.tyreCount ? Number(form.tyreCount) : null,
        vehicleDimension: form.vehicleDimension,
        ...(rcPhotoKey ? { rcPhotoKey } : {}),
      };
      if (editing) {
        await vehicleApi.update(editing._id, payload);
      } else {
        await vehicleApi.create(payload);
      }
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<Vehicle>[] = [
    { header: "Registration No.", render: (v) => <span className="font-medium">{v.registrationNumber}</span> },
    { header: "Type", render: (v) => v.type || "—" },
    { header: "Capacity", render: (v) => v.capacity || "—" },
    { header: "Ownership", render: (v) => (v.ownershipType === "third_party" ? "Third Party" : "Company") },
    { header: "Base Location", render: (v) => v.baseLocation || "—" },
    { header: "Status", render: (v) => <Badge tone={statusTone[v.status]}>{v.status.replace("_", " ")}</Badge> },
    {
      header: "",
      render: (v) => (
        <div className="flex gap-3">
          <a href={`/vehicles/${v._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button onClick={() => openEdit(v)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Vehicles</h1>
          <p className="text-sm text-text-secondary">Create and update fleet vehicles.</p>
        </div>
        <Button onClick={openCreate}>Add Vehicle</Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={vehicles ?? []}
          emptyMessage="No vehicles added yet."
          onRowClick={(v) => (window.location.href = `/vehicles/${v._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title={editing ? "Edit Vehicle" : "Add Vehicle"} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration Number">
              <TextInput
                required
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                placeholder="MH12AB1234"
              />
            </Field>
            <Field label="Type">
              <TextInput
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="Truck, Container..."
              />
            </Field>
            <Field label="Capacity">
              <TextInput
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="10 Ton"
              />
            </Field>
            <Field label="Base Location">
              <TextInput
                value={form.baseLocation}
                onChange={(e) => setForm({ ...form, baseLocation: e.target.value })}
                placeholder="Pune"
              />
            </Field>
            <Field label="Vehicle Dimension">
              <TextInput
                value={form.vehicleDimension}
                onChange={(e) => setForm({ ...form, vehicleDimension: e.target.value })}
                placeholder="20ft x 8ft"
              />
            </Field>
            <Field label="Tyre Count">
              <TextInput type="number" value={form.tyreCount} onChange={(e) => setForm({ ...form, tyreCount: e.target.value })} />
            </Field>
            <Field label="Odometer Reading">
              <TextInput
                type="number"
                value={form.odometerReading}
                onChange={(e) => setForm({ ...form, odometerReading: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">RC & Ownership</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="RC Number">
                <TextInput value={form.rcNumber} onChange={(e) => setForm({ ...form, rcNumber: e.target.value })} />
              </Field>
              <Field label="Ownership Type">
                <Select
                  value={form.ownershipType}
                  onChange={(e) => setForm({ ...form, ownershipType: e.target.value as "company" | "third_party" })}
                >
                  <option value="company">Company Owned</option>
                  <option value="third_party">Third Party</option>
                </Select>
              </Field>
              {form.ownershipType === "company" && (
                <Field label="Owner Name" className="col-span-2">
                  <TextInput value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                </Field>
              )}
              <Field label="RC Photo" className="col-span-2">
                <input type="file" accept="image/*,.pdf" onChange={(e) => setRcPhoto(e.target.files?.[0] || null)} className="text-sm" />
              </Field>
            </div>
          </div>

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
