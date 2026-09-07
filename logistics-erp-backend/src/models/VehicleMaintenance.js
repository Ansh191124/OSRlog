import mongoose from "mongoose";

const { Schema } = mongoose;

const vehicleMaintenanceSchema = new Schema(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true, trim: true },
    cost: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("VehicleMaintenance", vehicleMaintenanceSchema);
