import { useParams } from "react-router-dom";
import { driverApi, clientApi, employeeApi, reservationApi, lorryReceiptApi } from "../../api/entities";
import type { PersonUser } from "../../types/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

const apiByKind = { driver: driverApi, client: clientApi, employee: employeeApi };

function PersonDetail({ kind, label }: { kind: "driver" | "client" | "employee"; label: string }) {
  const { id } = useParams<{ id: string }>();
  const api = apiByKind[kind];
  const { data: people, isLoading, error, reload } = useApiData(() => api.list());
  const person = (people as PersonUser[] | null)?.find((p) => p._id === id) || null;

  const { data: reservations } = useApiData(
    () => (kind === "client" ? reservationApi.list() : Promise.resolve([])),
    [kind]
  );
  const { data: clientLrs } = useApiData(
    () => (kind === "client" ? lorryReceiptApi.list() : Promise.resolve([])),
    [kind]
  );
  const personReservations = (reservations || []).filter((r) => r.client?._id === id);
  const personLrs = (clientLrs || []).filter((l) => l.client?._id === id);

  return (
    <DetailPage title={person?.name || label} subtitle={`${label} detail`}>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!person ? (
          <p className="text-sm text-text-secondary">{label} not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Contact">
              <DetailField label="Name" value={person.name} />
              <DetailField label="Email" value={person.email} />
              <DetailField label="Phone" value={person.phone} />
              <DetailField label="Alternate Phone" value={person.alternatePhone} />
              <DetailField label="Status" value={<Badge tone={person.isActive ? "success" : "neutral"}>{person.isActive ? "Active" : "Inactive"}</Badge>} />
            </DetailSection>

            {kind === "driver" && (
              <DetailSection title="Driver Details">
                <DetailField label="License Number" value={person.licenseNumber} />
                <DetailField label="License Type" value={person.licenseType} />
                <DetailField label="License Expiry" value={person.licenseExpiry ? new Date(person.licenseExpiry).toLocaleDateString() : undefined} />
                <DetailField label="Date of Birth" value={person.dob ? new Date(person.dob).toLocaleDateString() : undefined} />
                <DetailField label="Driver Type" value={person.driverType === "independent" ? "Independent / One-time" : "Company Employed"} />
                <DetailField label="Employment Status" value={person.employmentType === "temporary" ? "Temporary" : "Permanent"} />
              </DetailSection>
            )}

            {kind === "client" && (
              <>
                <DetailSection title="Business Details">
                  <DetailField label="Company Name" value={person.companyName} />
                  <DetailField label="GSTIN" value={person.gstin} />
                  <DetailField label="Business Type" value={person.businessType} />
                  <DetailField label="Address" value={person.address} />
                </DetailSection>

                {personReservations.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h2 className="mb-4 text-sm font-semibold text-text-primary">Reservation History</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                          <th className="py-1.5">Requested</th>
                          <th className="py-1.5">Approved</th>
                          <th className="py-1.5">Status</th>
                          <th className="py-1.5">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personReservations.map((r) => (
                          <tr key={r._id} className="border-b border-border last:border-0">
                            <td className="py-1.5">{r.requestedCount}</td>
                            <td className="py-1.5">{r.approvedCount}</td>
                            <td className="py-1.5">
                              <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Badge>
                            </td>
                            <td className="py-1.5">{new Date(r.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {personLrs.length > 0 && (
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h2 className="mb-4 text-sm font-semibold text-text-primary">Lorry Receipt History</h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                          <th className="py-1.5">LR No.</th>
                          <th className="py-1.5">Route</th>
                          <th className="py-1.5">Status</th>
                          <th className="py-1.5 text-right">Loading Slip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personLrs.map((l) => (
                          <tr key={l._id} className="border-b border-border last:border-0">
                            <td className="py-1.5">
                              <a href={`/lorry-receipts/${l._id}`} className="text-brand-600 hover:text-brand-700">
                                {l.lrNumber}
                              </a>
                            </td>
                            <td className="py-1.5">
                              {l.fromLocation} -&gt; {l.toLocation}
                            </td>
                            <td className="py-1.5">
                              <Badge tone="neutral">{l.status}</Badge>
                            </td>
                            <td className="py-1.5 text-right">
                              {l.loadingSlip
                                ? `#${l.loadingSlip.slipNumber} (${l.loadingSlip.status.replace(/_/g, " ")})`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {kind === "employee" && (
              <DetailSection title="Employee Details">
                <DetailField label="Category" value={person.employeeCategory} />
                <DetailField label="Guardian Name" value={person.guardianName} />
                <DetailField label="Aadhar Number" value={person.aadharNumber} />
                <DetailField label="Temporary Access" value={person.isTemporary ? `Yes (${person.temporaryScope || "—"})` : "No"} />
              </DetailSection>
            )}
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}

export function DriverDetailPage() {
  return <PersonDetail kind="driver" label="Driver" />;
}
export function ClientDetailPage() {
  return <PersonDetail kind="client" label="Client" />;
}
export function EmployeeDetailPage() {
  return <PersonDetail kind="employee" label="Employee" />;
}
