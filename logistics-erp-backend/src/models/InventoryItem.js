const mongoose = require("mongoose");
const { Schema } = mongoose;

const inventoryItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ["tyre", "urea", "diesel", "custom"], default: "custom" },
  unit: { type: String, required: true, default: "pcs", trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  supplier: { type: String, trim: true },
  notes: { type: String, trim: true },
  status: { type: String, enum: ["pending_approval", "available"], default: "pending_approval" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

inventoryItemSchema.index({ name: "text", category: 1 });
module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
