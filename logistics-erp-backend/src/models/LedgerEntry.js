import mongoose from "mongoose";

const { Schema } = mongoose;

// Shared shape for Cashbook (cash) and Cashless book (online) entries, distinguished by `mode`.
const ledgerEntrySchema = new Schema(
  {
    mode: { type: String, enum: ["cash", "online"], required: true },
    direction: { type: String, enum: ["received", "sent"], required: true },
    amount: { type: Number, required: true },
    party: { type: String, trim: true }, // who money came from / went to
    description: { type: String, trim: true },
    relatedPayment: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    relatedTrip: { type: Schema.Types.ObjectId, ref: "Trip", default: null },
    relatedLoadingSlip: { type: Schema.Types.ObjectId, ref: "LoadingSlip", default: null },
    relatedInventoryPurchase: { type: Schema.Types.ObjectId, ref: "InventoryPurchase", default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // accountant
    proofUrl: { type: String, default: null },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("LedgerEntry", ledgerEntrySchema);
