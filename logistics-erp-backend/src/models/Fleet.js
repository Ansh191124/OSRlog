const mongoose = require("mongoose");
const { Schema } = mongoose;

// A client's approved quota of LR's (Lorry Receipts). Each LR the client later
// creates against this quota becomes its own Trip - see Trip.fleet/lrNumber/requestStatus.
const fleetSchema = new Schema({
  name: { type: String, required: true, trim: true },
  clientName: { type: String, required: true, trim: true },
  contactName: String,
  contactPhone: String,
  clientUser: { type: Schema.Types.ObjectId, ref: "User" },
  reservedVehicleCount: { type: Number, min: 0, default: 0 }, // the LR quota
  reservationStatus: { type: String, enum: ["none", "reserved", "approved"], default: "none" },
  reservationStartDate: { type: Date },
  reservationEndDate: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notes: String,
}, { timestamps: true });

fleetSchema.index({ clientName: "text", name: "text" });
module.exports = mongoose.model("Fleet", fleetSchema);
