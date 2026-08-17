const mongoose = require("mongoose");
const { Schema } = mongoose;

// Every field is intentionally optional since the ERP is filled manually
// by staff and nothing should block saving.
const driverSchema = new Schema(
  {
    name: { type: String },
    phone: { type: String },
    altPhone: { type: String },
    address: { type: String },
    licenseNumber: { type: String },
    licenseExpiry: { type: Date },
    aadhaarNumber: { type: String },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date },
    photoUrl: { type: String },
    licenseDocUrl: { type: String },
    salaryType: { type: String, enum: ["fixed", "per_trip", "commission"] },
    salaryAmount: { type: Number },
    status: { type: String, enum: ["active", "inactive", "on_leave"], default: "active" },
    assignedVehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    remark: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

driverSchema.index({ name: "text", phone: "text", licenseNumber: "text" });

module.exports = mongoose.model("Driver", driverSchema);
