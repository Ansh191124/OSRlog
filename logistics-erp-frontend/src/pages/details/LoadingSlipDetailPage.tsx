import { useParams } from "react-router-dom";
import { loadingSlipApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";
import type { LoadingSlip } from "../../types/entities";

const statusTone: Record<LoadingSlip["status"], "success" | "warning" | "danger" | "brand"> = {
  awaiting_payment: "warning",
  payment_submitted: "brand",
  verified: "success",
  payment_rejected: "danger",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

export function LoadingSlipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: slip, isLoading, error, reload } = useApiData(() => loadingSlipApi.get(id!), [id]);

  return (
    <DetailPage
      title={slip ? `Loading Slip #${slip.slipNumber}` : "Loading Slip"}
      subtitle={slip ? `LR #${slip.lorryReceipt?.lrNumber}` : undefined}
      actions={slip ? <Button onClick={() => loadingSlipApi.downloadPdf(slip._id, slip.slipNumber)}>Download PDF</Button> : undefined}
    >
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!slip ? (
          <p className="text-sm text-text-secondary">Loading Slip not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Status" value={<Badge tone={statusTone[slip.status]}>{slip.status.replace(/_/g, " ")}</Badge>} />
              <DetailField label="Client" value={slip.client?.companyName || slip.client?.name} />
              <DetailField label="Route" value={`${slip.lorryReceipt?.fromLocation} -> ${slip.lorryReceipt?.toLocation}`} />
              <DetailField label="Created By" value={slip.createdBy?.name} />
              <DetailField label="Created" value={new Date(slip.createdAt).toLocaleString()} />
            </DetailSection>

            <DetailSection title="Freight & Payment">
              <DetailField label="Freight Rate" value={`₹${slip.freightRate.toLocaleString()}`} />
              <DetailField label="Other Charges" value={`₹${slip.otherCharges.toLocaleString()}`} />
              <DetailField label="Advance" value={`₹${slip.advance.toLocaleString()}`} />
              <DetailField label="Total Amount" value={`₹${slip.totalAmount.toLocaleString()}`} />
              <DetailField label="Balance (To Pay)" value={<span className="font-semibold">₹{slip.balance.toLocaleString()}</span>} />
              <DetailField label="Payment Mode" value={slip.paymentMode === "consignee_pays" ? "Consignee Pays" : "Consignor Pays"} />
              <DetailField label="Payment Method" value={PAYMENT_METHOD_LABELS[slip.paymentMethod]} />
            </DetailSection>

            <DetailSection title="Verification">
              <DetailField label="Client Submitted At" value={slip.clientSubmittedAt ? new Date(slip.clientSubmittedAt).toLocaleString() : undefined} />
              <DetailField
                label="Payment Proof"
                value={
                  slip.paymentProofSignedUrl ? (
                    <a href={slip.paymentProofSignedUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">
                      View Proof
                    </a>
                  ) : slip.paymentProofUrl ? (
                    "Attached"
                  ) : undefined
                }
              />
              <DetailField label="Verified By" value={slip.verifiedBy?.name} />
              <DetailField label="Verified At" value={slip.verifiedAt ? new Date(slip.verifiedAt).toLocaleString() : undefined} />
              <DetailField label="Rejection Reason" value={slip.rejectionReason} />
            </DetailSection>
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
