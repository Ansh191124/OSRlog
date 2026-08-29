const mongoose = require("mongoose");
const { Schema } = mongoose;

const maintenanceSchema = new Schema(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleNoText: { type: String },

    maintenanceType: { type: String }, // e.g. "Oil Change", "Tyre Replacement"
    description: { type: String },

    status: {
      type: String,
      enum: ["pending", "upcoming", "ongoing", "completed", "cancelled"],
      default: "pending",
    },

    scheduledDate: { type: Date },
    startedDate: { type: Date },
    completedDate: { type: Date },

    odometerAtService: { type: Number },
    nextDueDate: { type: Date },
    nextDueOdometer: { type: Number },

    cost: { type: Number },
    inventoryCost: { type: Number, default: 0 },
    vendor: { type: String },
    invoiceUrl: { type: String },

    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    remark: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ vehicle: 1 });
maintenanceSchema.index({ nextDueDate: 1 });

module.exports = mongoose.model("Maintenance", maintenanceSchema);
