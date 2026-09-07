import { ledgerApi } from "../../api/entities";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

// "Can see all Received Transaction, Sent Transaction, Pending of every one
// not other accountant Transaction" — received/sent totals are this
// accountant's own recorded entries; pending is the shared request queue.
export function AccountantOverview() {
  const { data: summary, isLoading, error, reload } = useApiData(() => ledgerApi.overview());

  const cards = [
    { label: "Received (by you)", value: summary?.received },
    { label: "Sent (by you)", value: summary?.sent },
    { label: "Pending Requests", value: summary?.pending },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">Your transaction summary.</p>

      <div className="mt-6">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
                <p className="text-sm text-text-secondary">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {c.label.includes("Pending") ? (c.value ?? "—") : `₹${(c.value ?? 0).toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
