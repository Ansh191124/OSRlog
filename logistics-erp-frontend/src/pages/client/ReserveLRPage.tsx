import { useState, type FormEvent } from "react";
import { reservationApi } from "../../api/entities";
import type { LRReservation } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const statusTone: Record<LRReservation["status"], "success" | "warning" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function ReserveLRPage() {
  const { data: reservations, isLoading, error: loadError, reload } = useApiData(() => reservationApi.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [count, setCount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await reservationApi.create(Number(count));
      setModalOpen(false);
      setCount("1");
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: Column<LRReservation>[] = [
    { header: "Requested", render: (r) => r.requestedCount },
    { header: "Approved", render: (r) => (r.status === "approved" ? r.approvedCount : "—") },
    {
      header: "LR No. Block",
      render: (r) => (r.status === "approved" && r.startNumber != null ? `${r.startNumber} – ${r.endNumber}` : "—"),
    },
    { header: "Status", render: (r) => <Badge tone={statusTone[r.status]}>{r.status}</Badge> },
    { header: "Requested On", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      header: "",
      render: (r) => (
        <a href={`/reservations/${r._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Reserve LR</h1>
          <p className="text-sm text-text-secondary">
            Request Admin/Co-Admin to reserve a number of Lorry Receipts (1 LR = 1 Trip).
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Request Reservation</Button>
      </div>

      <AsyncState isLoading={isLoading} error={loadError} onRetry={reload}>
        <Table
          columns={columns}
          rows={reservations ?? []}
          emptyMessage="No reservation requests yet."
          onRowClick={(r) => (window.location.href = `/reservations/${r._id}`)}
        />
      </AsyncState>

      <Modal open={modalOpen} title="Request LR Reservation" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Number of LRs">
            <TextInput type="number" min={1} required value={count} onChange={(e) => setCount(e.target.value)} />
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
