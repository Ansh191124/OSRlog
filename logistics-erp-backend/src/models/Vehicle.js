import mongoose from "mongoose";

const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, trim: true }, // "Vehicle Type"
    capacity: { type: String, trim: true }, // "Maximum Load Capacity"
    status: {
      type: String,
      enum: ["available", "on_trip", "maintenance", "inactive"],
      default: "available",
    },
    assignedVehicleMaster: { type: Schema.Types.ObjectId, ref: "User", default: null },
    currentDriver: { type: Schema.Types.ObjectId, ref: "User", default: null },
    baseLocation: { type: String, trim: true },

    rcNumber: { type: String, trim: true },
    rcPhotoKey: { type: String, default: null }, // S3 key via /api/uploads/proof
    // If third_party, ownerName is not collected (per doc: "If Third Party, don't ask details").
    ownershipType: { type: String, enum: ["company", "third_party"], default: "company" },
    ownerName: { type: String, trim: true },
    odometerReading: { type: Number, default: 0 },
    tyreCount: { type: Number, default: null },
    vehicleDimension: { type: String, trim: true }, // e.g. "20ft x 8ft x 8ft"
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
