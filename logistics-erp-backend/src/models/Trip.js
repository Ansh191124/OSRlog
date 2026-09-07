import mongoose from "mongoose";

const { Schema } = mongoose;

const tripLogSchema = new Schema(
  {
    status: { type: String, trim: true },
    note: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// One LR/leg of a (possibly multi-leg) trip — "the vehicle master can add
// multiple LRs" to a single running trip as it progresses through legs.
const legSchema = new Schema(
  {
    lorryReceipt: { type: Schema.Types.ObjectId, ref: "LorryReceipt", required: true },
    fromLocation: { type: String, trim: true },
    toLocation: { type: String, trim: true },
    freight: { type: Number, default: 0 },
    odometerReading: { type: Number, default: null },
    advance: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deliveredAt: { type: Date, default: null },
    deliveredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Fixed expense categories matching the physical Trip Sheet ledger.
export const TRIP_EXPENSE_CATEGORIES = [
  "Dala",
  "Border",
  "Police",
  "Grease+Air",
  "Guide",
  "Parking",
  "Fooding",
  "Urea Nagad",
  "Kiraya",
  "Toll Tax",
  "Diesel",
  "Salary",
  "Incentive",
  "Urea",
  "Labour",
];

const expenseSchema = new Schema(
  {
    category: { type: String, enum: TRIP_EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const tripSchema = new Schema(
  {
    legs: { type: [legSchema], default: [] },

    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "User", default: null },
    vehicleMaster: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["created", "running", "completed", "closed"],
      default: "created",
    },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    timeIn: { type: String, trim: true },
    timeOut: { type: String, trim: true },

    // Diesel/mileage are reported once per trip (not per leg), per the trip sheet.
    dieselLiters: { type: Number, default: 0 },
    dieselPricePerLiter: { type: Number, default: 0 },
    dieselTotalCost: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 }, // odometer-measured
    gpsKm: { type: Number, default: 0 }, // manual entry — no live GPS integration
    mileage: { type: Number, default: 0 },

    lrRate: { type: Number, default: 0 },
    freightRate: { type: Number, default: 0 }, // trip-wide total, sums legs' freight when filled

    expenses: { type: [expenseSchema], default: [] },

    logs: { type: [tripLogSchema], default: [] },

    closedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    closedAt: { type: Date, default: null },

    // If this trip's LRs still have an outstanding Loading Slip balance when
    // the Vehicle Master tries to close it, they must submit what the client
    // paid at delivery for Accountant verification first — mirrors the
    // Loading Slip payment flow (cash skips proof, else proof required).
    // The trip only actually closes once this is verified.
    closurePayment: {
      status: { type: String, enum: ["none", "pending_verification", "verified", "rejected"], default: "none" },
      amount: { type: Number, default: 0 },
      paymentMethod: { type: String, enum: ["cash", "online", "upi", "bank_transfer", "cheque", null], default: null },
      proofUrl: { type: String, default: null },
      submittedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      submittedAt: { type: Date, default: null },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      verifiedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null },
    },
  },
  { timestamps: true }
);

tripSchema.pre("save", function computeDerived(next) {
  this.dieselTotalCost = Number((this.dieselLiters * this.dieselPricePerLiter).toFixed(2));
  this.mileage = this.dieselLiters > 0 ? Number((this.distanceKm / this.dieselLiters).toFixed(2)) : 0;
  next();
});

export default mongoose.model("Trip", tripSchema);
