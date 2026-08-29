const mongoose = require("mongoose");
const { Schema } = mongoose;

const inventoryUsageSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  maintenance: { type: Schema.Types.ObjectId, ref: "Maintenance", required: true },
  quantity: { type: Number, required: true, min: 0.0001 },
  unitCost: { type: Number, required: true, min: 0 },
  usedAt: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

inventoryUsageSchema.index({ maintenance: 1, createdAt: -1 });
module.exports = mongoose.model("InventoryUsage", inventoryUsageSchema);
