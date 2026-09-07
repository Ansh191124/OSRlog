import { useState, type FormEvent } from "react";
import { clientApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  alternatePhone: "",
  companyName: "",
  address: "",
  gstin: "",
  businessType: "",
};

export function ClientsPage() {
  const { data: clients, isLoading, error: loadError, reload } = useApiData(() => clientApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string } | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(client: PersonUser) {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      alternatePhone: client.alternatePhone || "",
      companyName: client.companyName || "",
      address: client.address || "",
      gstin: client.gstin || "",
      businessType: client.businessType || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (editing) {
        await clientApi.update(editing._id, {
          name: form.name,
          phone: form.phone,
          alternatePhone: form.alternatePhone,
          companyName: form.companyName,
          address: form.address,
          gstin: form.gstin,
          businessType: form.businessType,
        });
      } else {
        const { user, tempPassword } = await clientApi.create(form);
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
    { header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { header: "Company", render: (c) => c.companyName || "—" },
    { header: "GSTIN", render: (c) => c.gstin || "—" },
    { header: "Email", render: (c) => c.email },
    { header: "Phone", render: (c) => c.phone || "—" },
    { header: "Status", render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge> },
    {
      header: "",
      render: (c) => (
        <div className="flex gap-3">
          <a href={`/clients/${c._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button onClick={() => openEdit(c)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
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
          <h1 className="text-xl font-semibold text-text-primary">Clients</h1>
          <p className="text-sm text-text-secondary">Create and update client accounts.</p>
        </div>
        <Button onClick={openCreate}>Add Client</Button>
      </div>

      {createdCredentials && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>
            Client account created for <strong>{createdCredentials.email}</strong>. Temporary password:{" "}
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
          rows={clients ?? []}
          emptyMessage="No clients added yet."
          onRowClick={(c) => (window.location.href = `/clients/${c._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title={editing ? "Edit Client" : "Add Client"} onClose={() => setModalOpen(false)}>
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
            <Field label="Company Name">
              <TextInput value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </Field>
            <Field label="Business Type">
              <TextInput value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
            </Field>
            <Field label="GSTIN">
              <TextInput value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </Field>
            <Field label="Address" className="col-span-2">
              <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
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
