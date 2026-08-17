const mongoose = require("mongoose");
const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    vehicleNo: { type: String, unique: true, sparse: true },
    vehicleType: { type: String }, // truck, trailer, tempo, etc
    modelName: { type: String },
    manufactureYear: { type: Number },
    ownerType: { type: String, enum: ["owned", "market", "attached"] },
    capacityTon: { type: Number },
    chassisNumber: { type: String },
    engineNumber: { type: String },

    rcNumber: { type: String },
    rcExpiry: { type: Date },
    insuranceNumber: { type: String },
    insuranceExpiry: { type: Date },
    permitNumber: { type: String },
    permitExpiry: { type: Date },
    fitnessExpiry: { type: Date },
    pucExpiry: { type: Date },

    currentOdometer: { type: Number },
    tankCapacity: { type: Number },

    photoUrl: { type: String },
    rcDocUrl: { type: String },
    insuranceDocUrl: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive", "in_maintenance", "sold"],
      default: "active",
    },
    remark: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

vehicleSchema.index({ vehicleNo: "text", modelName: "text", chassisNumber: "text" });

module.exports = mongoose.model("Vehicle", vehicleSchema);
