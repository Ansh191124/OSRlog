import { useParams } from "react-router-dom";
import { reservationApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { LRReservation } from "../../types/entities";

const statusTone: Record<LRReservation["status"], "success" | "warning" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: reservations, isLoading, error, reload } = useApiData(() => reservationApi.list());
  const reservation = reservations?.find((r) => r._id === id) || null;

  return (
    <DetailPage title={reservation ? `Reservation — ${reservation.client?.companyName || reservation.client?.name}` : "Reservation"}>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!reservation ? (
          <p className="text-sm text-text-secondary">Reservation not found, or you don't have access to it.</p>
        ) : (
          <DetailSection title="Overview">
            <DetailField label="Client" value={reservation.client?.companyName || reservation.client?.name} />
            <DetailField label="Status" value={<Badge tone={statusTone[reservation.status]}>{reservation.status}</Badge>} />
            <DetailField label="Requested Count" value={reservation.requestedCount} />
            <DetailField label="Approved Count" value={reservation.approvedCount} />
            {reservation.startNumber != null && reservation.endNumber != null && (
              <DetailField
                label="Reserved LR No. Block"
                value={`${reservation.startNumber} – ${reservation.endNumber}`}
              />
            )}
            <DetailField label="Created" value={new Date(reservation.createdAt).toLocaleString()} />
          </DetailSection>
        )}
      </AsyncState>
    </DetailPage>
  );
}
