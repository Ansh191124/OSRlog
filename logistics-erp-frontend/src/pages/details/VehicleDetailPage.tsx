import { useParams } from "react-router-dom";
import { vehicleApi, tripApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import { useApp } from "../../context/AppContext";
import type { Trip } from "../../types/entities";

const statusTone = {
  available: "success",
  on_trip: "brand",
  maintenance: "warning",
  inactive: "neutral",
} as const;

const tripStatusTone: Record<Trip["status"], "success" | "brand" | "warning" | "neutral"> = {
  created: "neutral",
  running: "brand",
  completed: "success",
  closed: "success",
};

// Derived "where is it right now" — no live GPS integration, so this is the
// last delivered leg's destination on a running trip, or the trip's overall
// destination once completed, or just the vehicle's base when idle.
function currentLocation(vehicle: { baseLocation?: string }, runningTrip: Trip | undefined) {
  if (!runningTrip) return vehicle.baseLocation || "—";
  const deliveredLegs = runningTrip.legs.filter((l) => l.deliveredAt);
  if (deliveredLegs.length > 0) return `${deliveredLegs[deliveredLegs.length - 1].toLocation} (in transit)`;
  return `${runningTrip.legs[0]?.fromLocation || vehicle.baseLocation || "—"} (departing)`;
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { scope } = useApp();
  const canSeeTrips = scope === "admin" || scope === "co_admin";
  const { data: vehicles, isLoading, error, reload } = useApiData(() => vehicleApi.list());
  const { data: allTrips } = useApiData(() => (canSeeTrips ? tripApi.list() : Promise.resolve([])), [canSeeTrips]);
  const vehicle = vehicles?.find((v) => v._id === id) || null;

  const vehicleTrips = (allTrips ?? []).filter((t) => t.vehicle._id === id);
  const runningTrip = vehicleTrips.find((t) => t.status === "running");

  return (
    <DetailPage title={vehicle?.registrationNumber || "Vehicle"} subtitle="Vehicle detail">
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!vehicle ? (
          <p className="text-sm text-text-secondary">Vehicle not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Registration Number" value={vehicle.registrationNumber} />
              <DetailField label="Status" value={<Badge tone={statusTone[vehicle.status]}>{vehicle.status.replace("_", " ")}</Badge>} />
              <DetailField label="Type" value={vehicle.type} />
              <DetailField label="Capacity" value={vehicle.capacity} />
              <DetailField label="Base Location" value={vehicle.baseLocation} />
              <DetailField label="Vehicle Dimension" value={vehicle.vehicleDimension} />
              <DetailField label="Tyre Count" value={vehicle.tyreCount} />
              <DetailField label="Odometer Reading" value={vehicle.odometerReading?.toLocaleString()} />
            </DetailSection>

            <DetailSection title="Ownership & RC">
              <DetailField label="RC Number" value={vehicle.rcNumber} />
              <DetailField label="Ownership Type" value={vehicle.ownershipType === "third_party" ? "Third Party" : "Company"} />
              <DetailField label="Owner Name" value={vehicle.ownerName} />
            </DetailSection>

            <DetailSection title="Assignment">
              <DetailField label="Assigned Vehicle Master" value={vehicle.assignedVehicleMaster?.name} />
              <DetailField label="Current Driver" value={vehicle.currentDriver?.name} />
            </DetailSection>

            {canSeeTrips && (
              <>
                <DetailSection title="Current Location">
                  <DetailField label="Location" value={currentLocation(vehicle, runningTrip)} />
                  <DetailField
                    label="Active Trip"
                    value={
                      runningTrip ? (
                        <a href={`/trips/${runningTrip._id}`} className="text-brand-600 hover:text-brand-700">
                          {runningTrip.fromLocation} -&gt; {runningTrip.toLocation}
                        </a>
                      ) : (
                        "Not currently on a trip"
                      )
                    }
                  />
                </DetailSection>

                <div className="rounded-xl border border-border bg-surface p-5">
                  <h2 className="mb-4 text-sm font-semibold text-text-primary">Trip History ({vehicleTrips.length})</h2>
                  {vehicleTrips.length === 0 ? (
                    <p className="text-sm text-text-secondary">No trips recorded for this vehicle yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                          <th className="py-1.5">Route</th>
                          <th className="py-1.5">Driver</th>
                          <th className="py-1.5">Legs</th>
                          <th className="py-1.5">Status</th>
                          <th className="py-1.5">Started</th>
                          <th className="py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleTrips.map((t) => (
                          <tr key={t._id} className="border-b border-border last:border-0">
                            <td className="py-1.5">
                              {t.fromLocation} -&gt; {t.toLocation}
                            </td>
                            <td className="py-1.5">{t.driver?.name || "—"}</td>
                            <td className="py-1.5">{t.legs.length}</td>
                            <td className="py-1.5">
                              <Badge tone={tripStatusTone[t.status]}>{t.status}</Badge>
                            </td>
                            <td className="py-1.5">{t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"}</td>
                            <td className="py-1.5">
                              <a href={`/trips/${t._id}`} className="text-brand-600 hover:text-brand-700">
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
