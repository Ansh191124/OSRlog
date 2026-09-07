import { useParams } from "react-router-dom";
import { inventoryApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: items, isLoading, error, reload } = useApiData(() => inventoryApi.list());
  const item = items?.find((i) => i._id === id) || null;

  return (
    <DetailPage title={item?.name || "Inventory Item"}>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!item ? (
          <p className="text-sm text-text-secondary">Item not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Name" value={item.name} />
              <DetailField label="In Stock (Left)" value={`${item.quantity} ${item.unit || ""}`.trim()} />
              <DetailField label="Total Received" value={`${item.totalReceived} ${item.unit || ""}`.trim()} />
              <DetailField label="Total Used" value={`${item.totalUsed} ${item.unit || ""}`.trim()} />
              <DetailField label="Notes" value={item.notes} />
              <DetailField label="Created" value={new Date(item.createdAt).toLocaleString()} />
              <DetailField label="Updated" value={new Date(item.updatedAt).toLocaleString()} />
            </DetailSection>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Usage History</h2>
              {!item.usageLog || item.usageLog.length === 0 ? (
                <p className="text-sm text-text-secondary">No usage recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                      <th className="py-1.5">Date</th>
                      <th className="py-1.5">Quantity Used</th>
                      <th className="py-1.5">Note</th>
                      <th className="py-1.5">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...item.usageLog].reverse().map((log, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1.5">{new Date(log.usedAt).toLocaleString()}</td>
                        <td className="py-1.5">
                          {log.quantityUsed} {item.unit || ""}
                        </td>
                        <td className="py-1.5">{log.note || "—"}</td>
                        <td className="py-1.5">{log.recordedBy?.name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
