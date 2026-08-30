const mongoose = require("mongoose");
const { Schema } = mongoose;

const fleetSchema = new Schema({
  name: { type: String, required: true, trim: true },
  clientName: { type: String, required: true, trim: true },
  contactName: String,
  contactPhone: String,
  status: { type: String, enum: ["pending_assignment", "active", "inactive"], default: "pending_assignment" },
  vehicles: [{ type: Schema.Types.ObjectId, ref: "Vehicle" }],
  assignedPerson: { type: Schema.Types.ObjectId, ref: "User" },
  clientUser: { type: Schema.Types.ObjectId, ref: "User" },
  fleetCodeFrom: { type: String, trim: true },
  fleetCodeTo: { type: String, trim: true },
  reservedVehicleCount: { type: Number, min: 0, default: 0 },
  reservationStatus: { type: String, enum: ["none", "reserved", "approved"], default: "none" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notes: String,
}, { timestamps: true });

fleetSchema.index({ clientName: "text", name: "text", status: 1 });
module.exports = mongoose.model("Fleet", fleetSchema);
