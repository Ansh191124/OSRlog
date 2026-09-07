import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function Table<T extends { _id: string }>({
  columns,
  rows,
  emptyMessage = "No records yet.",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  // When provided, every row becomes clickable (typically to open a detail
  // page) — clicks on an action button/link inside a cell are ignored so
  // "Approve"/"Reject"/"View" etc. keep working as before.
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-b-brand-700/15 bg-surface-muted">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row._id}
              onClick={
                onRowClick
                  ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a, input, select, textarea, [role='button']")) return;
                      onRowClick(row);
                    }
                  : undefined
              }
              className={`border-b border-border last:border-0 hover:bg-surface-muted/50 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-2.5 text-text-primary">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
