import { useParams } from "react-router-dom";
import { tripApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { Trip } from "../../types/entities";

const statusTone: Record<Trip["status"], "success" | "brand" | "warning" | "neutral"> = {
  created: "neutral",
  running: "brand",
  completed: "success",
  closed: "success",
};

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trip, isLoading, error, reload } = useApiData(() => tripApi.get(id!), [id]);

  const dieselTotal = trip ? trip.dieselTotalCost : 0;
  const totalExpenses = trip ? trip.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const totalAdvance = trip ? trip.legs.reduce((sum, l) => sum + (l.advance || 0), 0) : 0;
  const totalFreight = trip ? trip.legs.reduce((sum, l) => sum + (l.freight || 0), 0) : 0;

  return (
    <DetailPage
      title={trip ? `Trip — ${trip.vehicle.registrationNumber}` : "Trip"}
      subtitle={trip ? [trip.fromLocation, trip.toLocation].filter(Boolean).join(" -> ") : undefined}
      actions={trip ? <Button onClick={() => tripApi.downloadPdf(trip._id, trip.vehicle.registrationNumber)}>Download Trip Sheet</Button> : undefined}
    >
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!trip ? (
          <p className="text-sm text-text-secondary">Trip not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Status" value={<Badge tone={statusTone[trip.status]}>{trip.status}</Badge>} />
              <DetailField label="Vehicle" value={trip.vehicle.registrationNumber} />
              <DetailField label="Driver" value={trip.driver?.name} />
              <DetailField label="Vehicle Master" value={trip.vehicleMaster?.name} />
              <DetailField label="Start Date" value={trip.startDate ? new Date(trip.startDate).toLocaleDateString() : undefined} />
              <DetailField label="End Date" value={trip.endDate ? new Date(trip.endDate).toLocaleDateString() : undefined} />
              <DetailField label="Time In" value={trip.timeIn} />
              <DetailField label="Time Out" value={trip.timeOut} />
              <DetailField label="All Legs Delivered" value={trip.allLegsDelivered ? "Yes" : "No"} />
            </DetailSection>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Legs ({trip.legs.length})</h2>
              <div className="space-y-2">
                {trip.legs.map((leg) => (
                  <div key={leg._id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary">
                        LR #{leg.lorryReceipt.lrNumber} — {leg.fromLocation} -&gt; {leg.toLocation}
                      </span>
                      {leg.deliveredAt ? <Badge tone="success">Delivered</Badge> : <Badge tone="warning">Pending</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      Freight ₹{leg.freight.toLocaleString()} · Advance ₹{leg.advance.toLocaleString()}
                      {leg.odometerReading != null && ` · Odometer ${leg.odometerReading}`}
                      {leg.deliveredBy && ` · Delivered by ${leg.deliveredBy.name}`}
                      {leg.deliveredAt && ` on ${new Date(leg.deliveredAt).toLocaleDateString()}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <DetailSection title="Diesel & Mileage">
              <DetailField label="Diesel (Liters)" value={trip.dieselLiters} />
              <DetailField label="Diesel Price / Liter" value={`₹${trip.dieselPricePerLiter}`} />
              <DetailField label="Diesel Total Cost" value={`₹${dieselTotal.toLocaleString()}`} />
              <DetailField label="Distance (Odometer)" value={`${trip.distanceKm} km`} />
              <DetailField label="Distance (GPS)" value={`${trip.gpsKm} km`} />
              <DetailField label="Mileage" value={`${trip.mileage.toFixed(2)} km/l`} />
            </DetailSection>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Expenses</h2>
              {trip.expenses.length === 0 ? (
                <p className="text-sm text-text-secondary">No expenses recorded.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {trip.expenses.map((exp, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1.5 text-text-primary">{exp.category}</td>
                        <td className="py-1.5 text-right text-text-primary">₹{exp.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-2 font-semibold text-text-primary">Total</td>
                      <td className="pt-2 text-right font-semibold text-text-primary">₹{totalExpenses.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <DetailSection title="Summary">
              <DetailField label="Total Freight (Legs)" value={`₹${totalFreight.toLocaleString()}`} />
              <DetailField label="Total Advance Paid" value={`₹${totalAdvance.toLocaleString()}`} />
              <DetailField label="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} />
              <DetailField
                label="Net (Freight − Diesel − Expenses − Advance)"
                value={`₹${(totalFreight - dieselTotal - totalExpenses - totalAdvance).toLocaleString()}`}
              />
            </DetailSection>

            {trip.closurePayment && trip.closurePayment.status !== "none" && (
              <DetailSection title="Closing Payment">
                <DetailField label="Amount" value={`₹${trip.closurePayment.amount.toLocaleString()}`} />
                <DetailField
                  label="Status"
                  value={
                    <Badge
                      tone={
                        trip.closurePayment.status === "verified"
                          ? "success"
                          : trip.closurePayment.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {trip.closurePayment.status.replace(/_/g, " ")}
                    </Badge>
                  }
                />
                <DetailField label="Submitted By" value={trip.closurePayment.submittedBy?.name} />
                <DetailField
                  label="Submitted At"
                  value={trip.closurePayment.submittedAt ? new Date(trip.closurePayment.submittedAt).toLocaleString() : undefined}
                />
                <DetailField label="Verified By" value={trip.closurePayment.verifiedBy?.name} />
                {trip.closurePayment.rejectionReason && (
                  <DetailField label="Rejection Reason" value={trip.closurePayment.rejectionReason} />
                )}
                {trip.closurePayment.proofSignedUrl && (
                  <DetailField
                    label="Proof"
                    value={
                      <a href={trip.closurePayment.proofSignedUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">
                        View Proof
                      </a>
                    }
                  />
                )}
              </DetailSection>
            )}
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
