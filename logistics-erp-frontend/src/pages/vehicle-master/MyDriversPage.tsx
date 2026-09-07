import { driverApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

function isLicenseExpiringSoon(dateStr?: string) {
  if (!dateStr) return false;
  const days = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days < 60;
}

// Vehicle Master: read-only full detail on every driver, not just drivers
// currently on their own assigned vehicles.
export function MyDriversPage() {
  const { data: drivers, isLoading, error, reload } = useApiData(() => driverApi.list());

  const columns: Column<PersonUser>[] = [
    { header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
    { header: "Email", render: (d) => d.email },
    { header: "Phone", render: (d) => d.phone || "—" },
    { header: "License No.", render: (d) => d.licenseNumber || "—" },
    {
      header: "License Expiry",
      render: (d) =>
        d.licenseExpiry ? (
          <Badge tone={isLicenseExpiringSoon(d.licenseExpiry) ? "warning" : "neutral"}>
            {new Date(d.licenseExpiry).toLocaleDateString()}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      header: "Driver Type",
      render: (d) => <Badge tone={d.driverType === "independent" ? "warning" : "neutral"}>{d.driverType === "independent" ? "Independent" : "Company"}</Badge>,
    },
    {
      header: "Employment",
      render: (d) => <Badge tone={d.employmentType === "temporary" ? "warning" : "neutral"}>{d.employmentType === "temporary" ? "Temporary" : "Permanent"}</Badge>,
    },
    { header: "Status", render: (d) => <Badge tone={d.isActive ? "success" : "neutral"}>{d.isActive ? "Active" : "Inactive"}</Badge> },
    {
      header: "",
      render: (d) => (
        <a href={`/drivers/${d._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">Drivers</h1>
      <p className="mt-1 text-sm text-text-secondary">Full detail on every driver in the company.</p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={drivers ?? []}
            emptyMessage="No drivers added yet."
            onRowClick={(d) => (window.location.href = `/drivers/${d._id}`)}
          />
        </AsyncState>
      </div>
    </div>
  );
}
