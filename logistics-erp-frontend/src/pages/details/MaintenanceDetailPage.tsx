import { useParams } from "react-router-dom";
import { maintenanceApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: records, isLoading, error, reload } = useApiData(() => maintenanceApi.list());
  const record = records?.find((r) => r._id === id) || null;

  return (
    <DetailPage title={record ? `Maintenance — ${record.vehicle.registrationNumber}` : "Maintenance Record"}>
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!record ? (
          <p className="text-sm text-text-secondary">Record not found, or you don't have access to it.</p>
        ) : (
          <DetailSection title="Overview">
            <DetailField label="Vehicle" value={record.vehicle.registrationNumber} />
            <DetailField label="Description" value={record.description} />
            <DetailField label="Cost" value={`₹${record.cost.toLocaleString()}`} />
            <DetailField label="Date" value={new Date(record.date).toLocaleDateString()} />
            <DetailField label="Recorded By" value={record.recordedBy?.name} />
          </DetailSection>
        )}
      </AsyncState>
    </DetailPage>
  );
}
