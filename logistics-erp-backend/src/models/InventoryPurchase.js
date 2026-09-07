import mongoose from "mongoose";

const { Schema } = mongoose;

// A procurement request: Entry Master/Co-Admin/Admin specifies what to buy
// and how much it costs; the Accountant pays it (uploading their own proof)
// and that single action both settles the payment and confirms the request —
// at which point the stock is added to InventoryItem (see inventoryController.recordUsage
// for the matching consumption side).
const inventoryPurchaseSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String, trim: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "upi", "bank_transfer", "cheque"],
      default: "cash",
    },
    notes: { type: String, trim: true },

    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending_payment", "paid", "rejected"],
      default: "pending_payment",
    },

    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paidAt: { type: Date, default: null },
    proofUrl: { type: String, default: null },
    rejectionReason: { type: String, default: null },

    // Set once paid — the stock item this purchase's quantity was added to.
    inventoryItem: { type: Schema.Types.ObjectId, ref: "InventoryItem", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("InventoryPurchase", inventoryPurchaseSchema);
