import mongoose from "mongoose";

const { Schema } = mongoose;

// One consumption event — "Entry Master will update that this much this item
// is used" — kept as an audit trail alongside the running totals below.
const usageLogSchema = new Schema(
  {
    quantityUsed: { type: Number, required: true },
    note: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inventoryItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    notes: { type: String, trim: true },
    // quantity = totalReceived - totalUsed, kept in sync by whichever
    // controller changes either total (a verified InventoryPurchase adds to
    // totalReceived; recordUsage adds to totalUsed) — never edited directly.
    quantity: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    totalUsed: { type: Number, default: 0 },
    usageLog: { type: [usageLogSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("InventoryItem", inventoryItemSchema);
