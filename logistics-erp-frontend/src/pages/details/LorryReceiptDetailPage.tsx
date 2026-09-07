import { useParams } from "react-router-dom";
import { lorryReceiptApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { LorryReceipt } from "../../types/entities";

const statusTone: Record<LorryReceipt["status"], "success" | "warning" | "danger" | "brand" | "neutral"> = {
  requested: "warning",
  approved: "brand",
  rejected: "danger",
  assigned: "brand",
  used: "success",
};

const loadingSlipTone: Record<string, "success" | "warning" | "danger" | "brand" | "neutral"> = {
  awaiting_payment: "warning",
  payment_submitted: "brand",
  verified: "success",
  payment_rejected: "danger",
};

export function LorryReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lr, isLoading, error, reload } = useApiData(() => lorryReceiptApi.get(id!), [id]);

  return (
    <DetailPage
      title={lr ? `LR #${lr.lrNumber}` : "Lorry Receipt"}
      subtitle={lr ? `Bill #${lr.billNumber}` : undefined}
      actions={lr ? <Button onClick={() => lorryReceiptApi.downloadPdf(lr._id, lr.lrNumber)}>Download PDF</Button> : undefined}
    >
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!lr ? (
          <p className="text-sm text-text-secondary">Lorry Receipt not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Status" value={<Badge tone={statusTone[lr.status]}>{lr.status}</Badge>} />
              <DetailField label="Client" value={lr.client?.companyName || lr.client?.name} />
              <DetailField label="Route" value={`${lr.fromLocation} -> ${lr.toLocation}`} />
              <DetailField label="Goods Description" value={lr.goodsDescription} />
              <DetailField label="Truck Size" value={lr.truckSizeFt ? `${lr.truckSizeFt} ft` : undefined} />
              <DetailField label="Requested By" value={lr.requestedBy?.name} />
              <DetailField label="Approved By" value={lr.approvedBy?.name} />
              <DetailField label="Created" value={new Date(lr.createdAt).toLocaleString()} />
            </DetailSection>

            <DetailSection title="Consignor">
              <DetailField label="Name" value={lr.consignor?.name} />
              <DetailField label="Address" value={lr.consignor?.address} />
            </DetailSection>

            <DetailSection title="Consignee">
              <DetailField label="Name" value={lr.consignee?.name} />
              <DetailField label="Address" value={lr.consignee?.address} />
            </DetailSection>

            <DetailSection title="Loading Slip">
              {lr.loadingSlip ? (
                <>
                  <DetailField label="Slip Number" value={`#${lr.loadingSlip.slipNumber}`} />
                  <DetailField label="Status" value={<Badge tone={loadingSlipTone[lr.loadingSlip.status]}>{lr.loadingSlip.status.replace(/_/g, " ")}</Badge>} />
                  {lr.loadingSlip.totalAmount != null && (
                    <DetailField label="Total Amount" value={`₹${lr.loadingSlip.totalAmount.toLocaleString()}`} />
                  )}
                  <DetailField
                    label=""
                    value={
                      <a href={`/loading-slips/${lr.loadingSlip._id}`} className="text-brand-600 hover:text-brand-700">
                        View Loading Slip
                      </a>
                    }
                  />
                </>
              ) : (
                <DetailField label="Status" value="Not created yet" />
              )}
            </DetailSection>
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
