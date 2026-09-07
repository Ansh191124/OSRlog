import mongoose from "mongoose";

const { Schema } = mongoose;

// "Reserve LR -> Client will Request for Reserving particular no. of LR's
// (1 LR = 1 Trip) from admin or Co-admin." Approval increases the client's
// usable LR quota; each LorryReceipt the client creates consumes one unit.
const lrReservationSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedCount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedCount: { type: Number, default: 0 },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    // The contiguous LR-number block carved out for this reservation at
    // approval time (e.g. requesting 10 gives startNumber..endNumber, 10
    // numbers wide) — so a temporary/walk-in LR created afterward always
    // lands after the whole block, never inside it. `nextNumber` is the
    // cursor for the next unused number in the block.
    startNumber: { type: Number, default: null },
    endNumber: { type: Number, default: null },
    nextNumber: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("LRReservation", lrReservationSchema);
