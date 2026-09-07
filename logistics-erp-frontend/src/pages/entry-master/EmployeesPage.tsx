import { useState, type FormEvent } from "react";
import { employeeApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const categoryLabels: Record<string, string> = {
  vehicle_master: "Vehicle Master",
  entry_master: "Entry Master",
  accountant: "Accountant",
  temporary: "Temporary",
};

const emptyForm = { name: "", email: "", phone: "", alternatePhone: "", guardianName: "", aadharNumber: "" };

// Shared between Entry Master ("Employee: create, update") and Admin/Co-Admin
// ("Employee: their details & roles"). Category/access is assigned separately
// on the Roles & Access page, not here.
export function EmployeesPage() {
  const { data: employees, isLoading, error: loadError, reload } = useApiData(() => employeeApi.list());
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

  function openEdit(employee: PersonUser) {
    setEditing(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      alternatePhone: employee.alternatePhone || "",
      guardianName: employee.guardianName || "",
      aadharNumber: employee.aadharNumber || "",
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
        await employeeApi.update(editing._id, {
          name: form.name,
          phone: form.phone,
          alternatePhone: form.alternatePhone,
          guardianName: form.guardianName,
          aadharNumber: form.aadharNumber,
        });
      } else {
        const { user, tempPassword } = await employeeApi.create(form);
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
    { header: "Name", render: (e) => <span className="font-medium">{e.name}</span> },
    { header: "Email", render: (e) => e.email },
    { header: "Phone", render: (e) => e.phone || "—" },
    {
      header: "Category",
      render: (e) =>
        e.employeeCategory ? (
          <Badge tone="brand">
            {categoryLabels[e.employeeCategory]}
            {e.isTemporary ? " (Temporary)" : ""}
          </Badge>
        ) : (
          <Badge tone="neutral">Not assigned</Badge>
        ),
    },
    { header: "Status", render: (e) => <Badge tone={e.isActive ? "success" : "neutral"}>{e.isActive ? "Active" : "Inactive"}</Badge> },
    {
      header: "",
      render: (e) => (
        <div className="flex gap-3">
          <a href={`/employees/${e._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View
          </a>
          <button onClick={() => openEdit(e)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
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
          <h1 className="text-xl font-semibold text-text-primary">Employees</h1>
          <p className="text-sm text-text-secondary">
            Create employee profiles here. Assign role/category access on the Roles &amp; Access page.
          </p>
        </div>
        <Button onClick={openCreate}>Add Employee</Button>
      </div>

      {createdCredentials && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>
            Employee account created for <strong>{createdCredentials.email}</strong>. Temporary password:{" "}
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
          rows={employees ?? []}
          emptyMessage="No employees added yet."
          onRowClick={(e) => (window.location.href = `/employees/${e._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title={editing ? "Edit Employee" : "Add Employee"} onClose={() => setModalOpen(false)}>
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
            <Field label="Guardian Name">
              <TextInput value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
            </Field>
            <Field label="Aadhar Number">
              <TextInput value={form.aadharNumber} onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })} />
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
