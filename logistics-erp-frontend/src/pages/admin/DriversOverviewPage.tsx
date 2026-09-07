import { driverApi } from "../../api/entities";
import type { DriverSummary } from "../../types/entities";
import { Table, type Column } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

function isLicenseExpiringSoon(dateStr?: string) {
  if (!dateStr) return false;
  const days = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days < 60;
}

// Admin & Co-Admin: "All Basic information, All Trips they went, Trip earning
// of driver, Type of Status Temporary or permanent, License expiry."
export function DriversOverviewPage() {
  const { data: drivers, isLoading, error, reload } = useApiData(() => driverApi.summary());

  const columns: Column<DriverSummary>[] = [
    { header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
    { header: "Email", render: (d) => d.email },
    { header: "Phone", render: (d) => d.phone || "—" },
    {
      header: "Status",
      render: (d) => (
        <Badge tone={d.employmentType === "temporary" ? "warning" : "neutral"}>
          {d.employmentType === "temporary" ? "Temporary" : "Permanent"}
        </Badge>
      ),
    },
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
    { header: "Total Trips", render: (d) => d.tripCount },
    { header: "Total Earnings", render: (d) => `₹${d.totalEarnings.toLocaleString()}` },
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
      <p className="mt-1 text-sm text-text-secondary">
        Basic info, trip history and earnings for every driver.
      </p>

      <div className="mt-4">
        <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
          <Table
            columns={columns}
            rows={drivers ?? []}
            emptyMessage="No drivers yet."
            onRowClick={(d) => (window.location.href = `/drivers/${d._id}`)}
          />
        </AsyncState>
      </div>
    </div>
  );
}
