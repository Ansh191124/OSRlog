import { reservationApi } from "../../api/entities";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// "Overview -> All Transaction, All LR count, used LR, left LR, Requested LR."
// LR counts are real; a client-scoped transaction feed isn't wired up yet —
// see the note left for the user about LedgerEntry not carrying a client
// reference (only free-text `party`), so it can't be safely filtered per client.
export function ClientOverview() {
  const { data: summary, isLoading, error, reload } = useApiData(() => reservationApi.mySummary());

  const cards = [
    { label: "Reserved LRs", value: summary?.reserved },
    { label: "Used LRs", value: summary?.used },
    { label: "Left LRs", value: summary?.left },
    { label: "Pending Requests", value: summary?.requested },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Your Lorry Receipt quota at a glance.</p>

      <div className="mt-6">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
                <p className="text-sm text-text-secondary">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{c.value ?? "—"}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-5 text-sm text-text-secondary">
            Transaction history appears here once payments are tracked per client.
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
