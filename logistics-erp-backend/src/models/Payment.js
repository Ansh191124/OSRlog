import mongoose from "mongoose";

const { Schema } = mongoose;

// Driver expense/payment requests -> Vehicle Master approval -> Accountant execution
const paymentSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // driver
    trip: { type: Schema.Types.ObjectId, ref: "Trip", default: null },
    reason: { type: String, trim: true, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ["cash", "online"], default: "cash" },

    status: {
      type: String,
      enum: ["pending_vehicle_master", "approved_by_vehicle_master", "rejected", "paid"],
      default: "pending_vehicle_master",
    },

    vehicleMasterApprovedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    vehicleMasterApprovedAt: { type: Date, default: null },

    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null }, // accountant
    paidAt: { type: Date, default: null },
    proofUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
