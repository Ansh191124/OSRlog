const mongoose = require("mongoose");
const { Schema } = mongoose;

// A single approval queue used by driver advances, maintenance work and stock purchases.
const approvalRequestSchema = new Schema({
  requestType: { type: String, enum: ["driver_payment", "maintenance", "inventory_purchase", "fleet_reservation"], required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  paymentType: { type: String, enum: ["cash", "online"], default: "cash" },
  paymentMode: { type: String, enum: ["cash", "upi", "bank_transfer", "cheque", "card", "other"], default: "cash" },
  status: { type: String, enum: ["requested", "approved", "rejected", "paid"], default: "requested" },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  paidBy: { type: Schema.Types.ObjectId, ref: "User" },
  driver: { type: Schema.Types.ObjectId, ref: "Driver" },
  vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
  maintenance: { type: Schema.Types.ObjectId, ref: "Maintenance" },
  inventoryItem: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
  payment: { type: Schema.Types.ObjectId, ref: "Payment" },
  details: { type: String, trim: true },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  paidAt: Date,
  rejectionReason: String,
}, { timestamps: true });

approvalRequestSchema.index({ status: 1, requestType: 1, createdAt: -1 });
module.exports = mongoose.model("ApprovalRequest", approvalRequestSchema);
