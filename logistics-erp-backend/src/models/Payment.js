const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip" },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },

    partyName: { type: String },
    date: { type: Date },

    direction: { type: String, enum: ["received", "paid"] }, // received = money in, paid = money out

    category: {
      type: String,
      enum: ["freight", "advance", "expense", "salary", "maintenance", "fuel", "other"],
    },

    paymentType: { type: String, enum: ["cash", "online"] },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "cheque", "card", "other"],
    },
    transactionRef: { type: String },
    bankName: { type: String },

    amount: { type: Number },

    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },

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
