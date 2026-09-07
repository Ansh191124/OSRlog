import { auditLogApi } from "../../api/entities";
import type { AuditLog } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

function summarizeChange(log: AuditLog): string {
  if (!log.before || !log.after) return "—";
  const changed = Object.keys(log.after).filter(
    (key) => JSON.stringify((log.before as any)[key]) !== JSON.stringify((log.after as any)[key])
  );
  return changed.length > 0 ? changed.join(", ") : "no field changes";
}

// Admin: audit trail for trip edits/deletes and access changes, since
// Admin/Co-Admin are the only roles allowed to modify a trip after creation.
export function AuditLogPage() {
  const { data: logs, isLoading, error, reload } = useApiData(() => auditLogApi.list());

  const columns: Column<AuditLog>[] = [
    { header: "Action", render: (l) => <Badge tone="brand">{l.action}</Badge> },
    { header: "Entity", render: (l) => `${l.entityType} (${l.entityId.slice(-6)})` },
    { header: "Changed Fields", render: (l) => summarizeChange(l) },
    { header: "By", render: (l) => l.user?.name || "—" },
    { header: "When", render: (l) => new Date(l.at).toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Audit Log</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Every trip edit/delete and access change, with who made it and when.
      </p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table columns={columns} rows={logs ?? []} emptyMessage="No audit activity yet." />
        </AsyncState>
      </div>
    </div>
  );
}
