import mongoose from "mongoose";

const { Schema } = mongoose;

// Created by Co-Admin/Admin once an LR is approved: carries the freight rate and
// payment terms that used to live on the LR itself. Goes to the client for
// approval + payment, then to the Accountant for verification. Once verified,
// `lorryReceipt.loadingSlip` is stamped, which is what unlocks vehicle assignment.
const logSchema = new Schema(
  {
    status: { type: String, trim: true },
    note: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const loadingSlipSchema = new Schema(
  {
    slipNumber: { type: Number, required: true, unique: true },
    lorryReceipt: { type: Schema.Types.ObjectId, ref: "LorryReceipt", required: true, unique: true },
    // Null for a temporary/walk-in job — no client to review or pay through
    // the system; Co-Admin/Admin submits the payment proof directly instead.
    client: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isTemporary: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    freightRate: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }, // computed: freightRate + otherCharges
    balance: { type: Number, default: 0 }, // computed: totalAmount - advance ("To Pay")

    paymentMode: { type: String, enum: ["consignor_pays", "consignee_pays"], default: "consignor_pays" },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "upi", "bank_transfer", "cheque"],
      default: "cash",
    },

    status: {
      type: String,
      enum: ["awaiting_payment", "payment_submitted", "verified", "payment_rejected"],
      default: "awaiting_payment",
    },

    paymentProofUrl: { type: String, default: null },
    clientSubmittedAt: { type: Date, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    logs: { type: [logSchema], default: [] },
    pdfUrl: { type: String, default: null },
  },
  { timestamps: true }
);

loadingSlipSchema.pre("save", function computeTotals(next) {
  this.totalAmount = Number(((this.freightRate || 0) + (this.otherCharges || 0)).toFixed(2));
  this.balance = Number((this.totalAmount - (this.advance || 0)).toFixed(2));
  next();
});

export default mongoose.model("LoadingSlip", loadingSlipSchema);
