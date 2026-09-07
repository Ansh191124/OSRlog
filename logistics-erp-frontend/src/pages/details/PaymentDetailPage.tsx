import { useParams } from "react-router-dom";
import { paymentApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { Payment } from "../../types/entities";

const statusTone: Record<Payment["status"], "success" | "warning" | "danger" | "brand"> = {
  pending_vehicle_master: "warning",
  approved_by_vehicle_master: "brand",
  rejected: "danger",
  paid: "success",
};

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: payments, isLoading, error, reload } = useApiData(() => paymentApi.list());
  const payment = payments?.find((p) => p._id === id) || null;

  return (
    <DetailPage title={payment ? `Payment — ${payment.reason}` : "Payment"}>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!payment ? (
          <p className="text-sm text-text-secondary">Payment not found, or you don't have access to it.</p>
        ) : (
          <DetailSection title="Overview">
            <DetailField label="Status" value={<Badge tone={statusTone[payment.status]}>{payment.status.replace(/_/g, " ")}</Badge>} />
            <DetailField label="Reason" value={payment.reason} />
            <DetailField label="Amount" value={`₹${payment.amount.toLocaleString()}`} />
            <DetailField label="Mode" value={payment.mode} />
            <DetailField label="Requested By" value={payment.requestedBy?.name} />
            <DetailField label="Trip" value={payment.trip ? [payment.trip.fromLocation, payment.trip.toLocation].filter(Boolean).join(" -> ") : undefined} />
            <DetailField label="Vehicle Master Approved By" value={payment.vehicleMasterApprovedBy?.name} />
            <DetailField label="Vehicle Master Approved At" value={payment.vehicleMasterApprovedAt ? new Date(payment.vehicleMasterApprovedAt).toLocaleString() : undefined} />
            <DetailField label="Paid By" value={payment.paidBy?.name} />
            <DetailField label="Paid At" value={payment.paidAt ? new Date(payment.paidAt).toLocaleString() : undefined} />
            <DetailField label="Created" value={new Date(payment.createdAt).toLocaleString()} />
          </DetailSection>
        )}
      </AsyncState>
    </DetailPage>
  );
}
