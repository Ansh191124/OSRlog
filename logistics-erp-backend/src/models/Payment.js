const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip" },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    fleet: { type: Schema.Types.ObjectId, ref: "Fleet" },

    partyName: { type: String },
    date: { type: Date },

    direction: { type: String, enum: ["received", "paid"] }, // received = money in, paid = money out

    category: {
      type: String,
      enum: ["freight", "advance", "expense", "salary", "maintenance", "fuel", "fleet_reservation", "other"],
    },

    paymentType: { type: String, enum: ["cash", "online"] },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "cheque", "card", "other"],
    },
    transactionRef: { type: String },
    bankName: { type: String },

    // For cash fleet payments: who the client says they physically paid.
    paidToName: { type: String },

    amount: { type: Number },

    // "pending" = client-submitted, awaiting accountant verification.
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },

    receiptUrl: { type: String },
    remark: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentType: 1, direction: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ trip: 1 });
paymentSchema.index({ vehicle: 1 });
paymentSchema.index({ driver: 1 });
paymentSchema.index({ partyName: "text", transactionRef: "text" });

module.exports = mongoose.model("Payment", paymentSchema);
