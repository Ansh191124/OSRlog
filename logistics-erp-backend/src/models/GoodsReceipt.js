import mongoose from "mongoose";

const { Schema } = mongoose;

// Client-scoped, not trip-scoped: a GR is the sum of a client's LRs that are
// `used` (delivered) and not already swept into an earlier GR for them.
const goodsReceiptSchema = new Schema(
  {
    grNumber: { type: Number, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lorryReceipts: { type: [{ type: Schema.Types.ObjectId, ref: "LorryReceipt" }], default: [] },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pdfUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("GoodsReceipt", goodsReceiptSchema);
