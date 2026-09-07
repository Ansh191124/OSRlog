import { useState } from "react";
import { accessApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const CATEGORY_OPTIONS = [
  { value: "", label: "Not assigned" },
  { value: "vehicle_master", label: "Vehicle Master (Category I)" },
  { value: "entry_master", label: "Entry Master (Category II)" },
  { value: "accountant", label: "Accountant (Category III)" },
  { value: "temporary", label: "Temporary (Category IV)" },
];

export function RolesAccessPage() {
  const { data: employees, isLoading, error: loadError, reload } = useApiData(() => accessApi.listEmployees());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonUser | null>(null);
  const [form, setForm] = useState({ employeeCategory: "", isTemporary: false, temporaryScope: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openEdit(employee: PersonUser) {
    setEditing(employee);
    setForm({
      employeeCategory: employee.employeeCategory || "",
      isTemporary: employee.isTemporary,
      temporaryScope: employee.temporaryScope || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!editing) return;
    setError(null);
    setIsSaving(true);
    try {
      await accessApi.updateAccess(editing._id, {
        employeeCategory: form.employeeCategory || null,
        isTemporary: form.isTemporary,
        temporaryScope: form.isTemporary ? form.temporaryScope || null : null,
      });
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
    {
      header: "Category",
      render: (e) =>
        e.employeeCategory ? (
          <Badge tone="brand">{CATEGORY_OPTIONS.find((c) => c.value === e.employeeCategory)?.label}</Badge>
        ) : (
          <Badge tone="neutral">Not assigned</Badge>
        ),
    },
    {
      header: "Temporary",
      render: (e) =>
        e.isTemporary ? (
          <Badge tone="warning">Yes — {e.temporaryScope === "admin" ? "Admin scope" : "Co-Admin scope"}</Badge>
        ) : (
          "No"
        ),
    },
    {
      header: "",
      render: (e) => (
        <button onClick={() => openEdit(e)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Assign Access
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Roles &amp; Access</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Assign each employee's category and temporary access scope.
      </p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
          <Table
            columns={columns}
            rows={employees ?? []}
            emptyMessage="No employees yet — add one from the Employees page."
            onRowClick={(e) => (window.location.href = `/employees/${e._id}`)}
          />
        </AsyncState>
      </div>

      <Modal open={modalOpen} title={`Assign Access — ${editing?.name ?? ""}`} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Field label="Employee Category">
            <Select
              value={form.employeeCategory}
              onChange={(e) => setForm({ ...form, employeeCategory: e.target.value })}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.isTemporary}
              onChange={(e) => setForm({ ...form, isTemporary: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            Temporary employee (Category IV)
          </label>

          {form.isTemporary && (
            <Field label="Temporary Access Scope">
              <Select
                value={form.temporaryScope}
                onChange={(e) => setForm({ ...form, temporaryScope: e.target.value })}
              >
                <option value="">Select scope</option>
                <option value="admin">Admin</option>
                <option value="co_admin">Co-Admin</option>
              </Select>
            </Field>
          )}

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
