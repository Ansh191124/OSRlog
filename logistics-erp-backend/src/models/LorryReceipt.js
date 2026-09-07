import mongoose from "mongoose";

const { Schema } = mongoose;

const partySchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    address: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

const TRUCK_SIZES_FT = [14, 17, 19, 22, 24, 32, 34];

const lorryReceiptSchema = new Schema(
  {
    lrNumber: { type: Number, required: true, unique: true },
    billNumber: { type: Number, required: true, unique: true }, // separate series from lrNumber
    // Null for a temporary/walk-in job created directly by Co-Admin/Admin —
    // no client account is involved at all.
    client: { type: Schema.Types.ObjectId, ref: "User", default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // client or employee
    isTemporary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "assigned", "used"],
      default: "requested",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    fromLocation: { type: String, trim: true },
    toLocation: { type: String, trim: true },
    goodsDescription: { type: String, trim: true },
    truckSizeFt: { type: Number, enum: [...TRUCK_SIZES_FT, null], default: null },

    consignor: { type: partySchema, required: true },
    consignee: { type: partySchema, required: true },

    trip: { type: Schema.Types.ObjectId, ref: "Trip", default: null },
    // Set once this LR is swept into a client-level Goods Receipt; excludes it from future GRs.
    goodsReceipt: { type: Schema.Types.ObjectId, ref: "GoodsReceipt", default: null },
    // Set only once this LR's Loading Slip payment is Accountant-verified — this is
    // what unlocks vehicle assignment (see lorryReceiptController.listLorryReceipts
    // and tripController's assign/addLeg guards).
    loadingSlip: { type: Schema.Types.ObjectId, ref: "LoadingSlip", default: null },
    pdfUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("LorryReceipt", lorryReceiptSchema);
