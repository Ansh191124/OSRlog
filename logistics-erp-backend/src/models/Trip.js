const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * One row per trip-leg, matching the repeating table rows in the sheet:
 * DATE | PARTY NAME | FROM | TO | FREIGHT | ODOMETER | ADV | DIESEL | AMT
 * Embedded as a subdocument array on Trip - MongoDB has no separate join table.
 */
const tripEntrySchema = new Schema(
  {
    date: { type: Date },
    partyName: { type: String },
    fromLocation: { type: String },
    toLocation: { type: String },
    freight: { type: Number },
    odometer: { type: Number },
    adv: { type: Number }, // can be negative e.g. -10000 (submitted)
    diesel: { type: Number }, // litres
    amt: { type: Number },
  },
  { timestamps: true, _id: true }
);

/**
 * Matches the "EXPENSE" box on the sheet:
 * DALA, BORDER, POLICE, GREASE+AIR, GUIDE, PARKING, FOODING,
 * UREA NAGAD, KIRAYA, TOLL TAX, DIESEL, SALARY, INCENTIVE, UREA, LABOUR
 */
const tripExpenseSchema = new Schema(
  {
    dala: { type: Number },
    border: { type: Number },
    police: { type: Number },
    greaseAir: { type: Number },
    guide: { type: Number },
    parking: { type: Number },
    fooding: { type: Number },
    ureaNagad: { type: Number },
    kiraya: { type: Number },
    tollTax: { type: Number },
    diesel: { type: Number },
    salary: { type: Number },
    incentive: { type: Number },
    urea: { type: Number },
    labour: { type: Number },
    otherExpense: { type: Number },
    otherExpenseLabel: { type: String },
  },
  { _id: false }
);

/**
 * Matches the right-hand summary box and the bottom-left
 * "TANK FULL / FREIGHT / EXPENSES / P/L" box.
 *
 * IMPORTANT: every value here is manually entered, exactly like the paper
 * sheet - nothing is auto-calculated by force. The POST /api/trips/:id/calculate
 * helper endpoint can *suggest* values, but staff can overwrite anything before saving.
 */
const tripSummarySchema = new Schema(
  {
    drAdv: { type: Number },
    expenseTotal: { type: Number },
    total: { type: Number },

    gpsKm: { type: Number },
    mtrKm: { type: Number },
    diffKm: { type: Number },

    totalDieselLitres: { type: Number },
    totalDieselAmount: { type: Number },

    costPerKm: { type: Number },
    mileage: { type: Number },
    expensePercent: { type: Number },
    freightPerKm: { type: Number },
    plPerDay: { type: Number },
    days: { type: Number },

    tankFullLitres: { type: Number },
    tankFullAmount: { type: Number },
    tankFullDate: { type: Date },
    tankFullTime: { type: String },

    freightTotal: { type: Number },
    expensesTotal: { type: Number }, // shown negative on sheet
    profitLoss: { type: Number },
  },
  { _id: false }
);

/**
 * Maps to the header section of the physical "TRIP SHEET":
 * VEHICLE NO / DRIVER NAME / START DATE / END DATE / TIME IN / TIME OUT
 *
 * vehicle/driver link to master collections (optional), while
 * vehicleNoText/driverNameText store the manually typed value exactly like
 * the paper sheet, in case staff types a vehicle/driver not yet in the master list.
 */
const driverChangeSchema = new Schema(
  {
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    driverNameText: { type: String },
    effectiveAt: { type: Date },
    reason: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, _id: true }
);

const tripSchema = new Schema(
  {
    tripCode: { type: String, unique: true, sparse: true }, // e.g. TRIP-000123

    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    vehicleNoText: { type: String },

    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    driverNameText: { type: String },

    driverChanges: [driverChangeSchema],

    startDate: { type: Date },
    endDate: { type: Date },
    timeIn: { type: String }, // stored as text e.g. "7:48 PM" to match manual entry
    timeOut: { type: String },

    status: { type: String, enum: ["ongoing", "completed", "cancelled"], default: "ongoing" },

    remark: { type: String }, // e.g. "RS.10000 SUBMIT TO AMIT[5679],ADV"

    entries: [tripEntrySchema],
    expense: { type: tripExpenseSchema, default: () => ({}) },
    summary: { type: tripSummarySchema, default: () => ({}) },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

tripSchema.index({ tripCode: "text", vehicleNoText: "text", driverNameText: "text" });
tripSchema.index({ vehicle: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ startDate: -1 });

module.exports = mongoose.model("Trip", tripSchema);
