import { useState, type FormEvent } from "react";
import { driverApi, uploadApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

function isLicenseExpiringSoon(dateStr?: string) {
  if (!dateStr) return false;
  const days = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days < 60;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  alternatePhone: "",
  licenseNumber: "",
  licenseType: "",
  licenseExpiry: "",
  dob: "",
  employmentType: "permanent" as "permanent" | "temporary",
  driverType: "company" as "company" | "independent",
};

export function DriversPage() {
  const { data: drivers, isLoading, error: loadError, reload } = useApiData(() => driverApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [docProof, setDocProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setLicensePhoto(null);
    setDocProof(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(driver: PersonUser) {
    setEditing(driver);
    setForm({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || "",
      alternatePhone: driver.alternatePhone || "",
      licenseNumber: driver.licenseNumber || "",
      licenseType: driver.licenseType || "",
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : "",
      dob: driver.dob ? driver.dob.slice(0, 10) : "",
      employmentType: driver.employmentType || "permanent",
      driverType: driver.driverType || "company",
    });
    setLicensePhoto(null);
    setDocProof(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      let licensePhotoKey: string | undefined;
      let docProofKey: string | undefined;
      if (licensePhoto) {
        const uploaded = await uploadApi.uploadProof(licensePhoto);
        licensePhotoKey = uploaded.key;
      }
      if (docProof) {
        const uploaded = await uploadApi.uploadProof(docProof);
        docProofKey = uploaded.key;
      }
      const payload: Partial<PersonUser> & { email?: string } = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        alternatePhone: form.alternatePhone,
        licenseNumber: form.licenseNumber,
        licenseType: form.licenseType,
        licenseExpiry: form.licenseExpiry || undefined,
        dob: form.dob || undefined,
        employmentType: form.employmentType,
        driverType: form.driverType,
        ...(licensePhotoKey ? { licensePhotoKey } : {}),
        ...(docProofKey ? { docProofKey } : {}),
      };
      if (editing) {
        const { email, ...rest } = payload;
        await driverApi.update(editing._id, rest);
      } else {
        const { user, tempPassword } = await driverApi.create(payload);
        setCreatedCredentials({ email: user.email, tempPassword });
      }
      setModalOpen(false);
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<PersonUser>[] = [
    { header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
    { header: "Email", render: (d) => d.email },
    { header: "Phone", render: (d) => d.phone || "—" },
    { header: "License No.", render: (d) => d.licenseNumber || "—" },
    {
      header: "License Expiry",
      render: (d) =>
        d.licenseExpiry ? (
          <Badge tone={isLicenseExpiringSoon(d.licenseExpiry) ? "warning" : "neutral"}>
            {new Date(d.licenseExpiry).toLocaleDateString()}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      header: "Driver Type",
      render: (d) => <Badge tone={d.driverType === "independent" ? "warning" : "neutral"}>{d.driverType === "independent" ? "Independent" : "Company"}</Badge>,
    },
    {
      header: "Employment",
      render: (d) => <Badge tone={d.employmentType === "temporary" ? "warning" : "neutral"}>{d.employmentType === "temporary" ? "Temporary" : "Permanent"}</Badge>,
    },
    { header: "Status", render: (d) => <Badge tone={d.isActive ? "success" : "neutral"}>{d.isActive ? "Active" : "Inactive"}</Badge> },
    {
      header: "",
      render: (d) => (
        <div className="flex gap-3">
          <a href={`/drivers/${d._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button onClick={() => openEdit(d)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
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
          <h1 className="text-xl font-semibold text-text-primary">Drivers</h1>
          <p className="text-sm text-text-secondary">Create and update driver profiles.</p>
        </div>
        <Button onClick={openCreate}>Add Driver</Button>
      </div>

      {createdCredentials && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>
            Driver account created for <strong>{createdCredentials.email}</strong>. Temporary password:{" "}
            <code className="rounded bg-white px-1.5 py-0.5">{createdCredentials.tempPassword}</code> — share this
            with them; it won't be shown again.
          </span>
          <button onClick={() => setCreatedCredentials(null)} className="ml-4 text-brand-700 hover:text-brand-800">
            ✕
          </button>
        </div>
      )}

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={drivers ?? []}
          emptyMessage="No drivers added yet."
          onRowClick={(d) => (window.location.href = `/drivers/${d._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title={editing ? "Edit Driver" : "Add Driver"} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                required
                disabled={Boolean(editing)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Alternate Phone">
              <TextInput value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
            </Field>
            <Field label="Date of Birth">
              <TextInput type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </Field>
            <Field label="Driver Type">
              <Select
                value={form.driverType}
                onChange={(e) => setForm({ ...form, driverType: e.target.value as "company" | "independent" })}
              >
                <option value="company">Company Employed</option>
                <option value="independent">Independent / One-time</option>
              </Select>
            </Field>
            <Field label="Employment Status">
              <Select
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as "permanent" | "temporary" })}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </Select>
            </Field>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">License</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="License Number">
                <TextInput
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
              </Field>
              <Field label="License Type">
                <TextInput value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} placeholder="LMV, HMV..." />
              </Field>
              <Field label="License Expiry">
                <TextInput
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                />
              </Field>
              <Field label="License Photo">
                <input type="file" accept="image/*,.pdf" onChange={(e) => setLicensePhoto(e.target.files?.[0] || null)} className="text-sm" />
              </Field>
              <Field label="Other Document Proof" className="col-span-2">
                <input type="file" accept="image/*,.pdf" onChange={(e) => setDocProof(e.target.files?.[0] || null)} className="text-sm" />
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
