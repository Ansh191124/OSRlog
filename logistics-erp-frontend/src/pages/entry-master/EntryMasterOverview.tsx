import { Link } from "react-router-dom";
import { vehicleApi, driverApi, clientApi, employeeApi } from "../../api/entities";
import { useApiData } from "../../hooks/useApiData";

interface Counts {
  vehicles: number;
  drivers: number;
  clients: number;
  employees: number;
}

const cards: { key: keyof Counts; label: string; path: string }[] = [
  { key: "vehicles", label: "Vehicles", path: "/entry-master/vehicles" },
  { key: "drivers", label: "Drivers", path: "/entry-master/drivers" },
  { key: "clients", label: "Clients", path: "/entry-master/clients" },
  { key: "employees", label: "Employees", path: "/entry-master/employees" },
];

export function EntryMasterOverview() {
  const { data: counts, error, reload } = useApiData<Counts>(async () => {
    const [vehicles, drivers, clients, employees] = await Promise.all([
      vehicleApi.list(),
      driverApi.list(),
      clientApi.list(),
      employeeApi.list(),
    ]);
    return { vehicles: vehicles.length, drivers: drivers.length, clients: clients.length, employees: employees.length };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Vehicles, drivers, clients and employees at a glance.
      </p>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-danger-300 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          <span>{error}</span>
          <button onClick={reload} className="font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.path}
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand-300"
          >
            <p className="text-sm text-text-secondary">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {counts ? counts[card.key] : "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
