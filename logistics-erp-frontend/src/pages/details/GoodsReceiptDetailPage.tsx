import { useParams } from "react-router-dom";
import { goodsReceiptApi } from "../../api/entities";
import { DetailPage, DetailSection, DetailField } from "../../components/ui/DetailPage";
import { Button } from "../../components/ui/Button";
import { AsyncState } from "../../components/ui/AsyncState";
import { useApiData } from "../../hooks/useApiData";

export function GoodsReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: goodsReceipts, isLoading, error, reload } = useApiData(() => goodsReceiptApi.list());
  const gr = goodsReceipts?.find((g) => g._id === id) || null;
  const total = gr ? gr.lorryReceipts.reduce((sum, lr) => sum + (lr.loadingSlip?.totalAmount || 0), 0) : 0;

  return (
    <DetailPage
      title={gr ? `GR #${gr.grNumber}` : "Goods Receipt"}
      subtitle={gr ? gr.client?.companyName || gr.client?.name : undefined}
      actions={gr ? <Button onClick={() => goodsReceiptApi.downloadPdf(gr._id, gr.grNumber)}>Download PDF</Button> : undefined}
    >
      <AsyncState isLoading={isLoading} error={error} onRetry={reload}>
        {!gr ? (
          <p className="text-sm text-text-secondary">Goods Receipt not found, or you don't have access to it.</p>
        ) : (
          <>
            <DetailSection title="Overview">
              <DetailField label="Client" value={gr.client?.companyName || gr.client?.name} />
              <DetailField label="Client GSTIN" value={gr.client?.gstin} />
              <DetailField label="Issued By" value={gr.issuedBy?.name} />
              <DetailField label="Date" value={new Date(gr.createdAt).toLocaleDateString()} />
              <DetailField label="Total Value" value={`₹${total.toLocaleString()}`} />
            </DetailSection>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-text-primary">Bundled Lorry Receipts ({gr.lorryReceipts.length})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                    <th className="py-1.5">LR No.</th>
                    <th className="py-1.5">Bill No.</th>
                    <th className="py-1.5">Route</th>
                    <th className="py-1.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {gr.lorryReceipts.map((lr) => (
                    <tr key={lr._id} className="border-b border-border last:border-0">
                      <td className="py-1.5">
                        <a href={`/lorry-receipts/${lr._id}`} className="text-brand-600 hover:text-brand-700">
                          {lr.lrNumber}
                        </a>
                      </td>
                      <td className="py-1.5">{lr.billNumber}</td>
                      <td className="py-1.5">
                        {lr.fromLocation} -&gt; {lr.toLocation}
                      </td>
                      <td className="py-1.5 text-right">₹{(lr.loadingSlip?.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AsyncState>
    </DetailPage>
  );
}
