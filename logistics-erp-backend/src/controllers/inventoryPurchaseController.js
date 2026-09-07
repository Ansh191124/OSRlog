import InventoryPurchase from "../models/InventoryPurchase.js";
import InventoryItem from "../models/InventoryItem.js";
import LedgerEntry from "../models/LedgerEntry.js";
import { notifyAccountants, notifyUser } from "../utils/notify.js";
import { recordAudit } from "../utils/audit.js";

const PURCHASE_POPULATE = [
  { path: "requestedBy", select: "name" },
  { path: "paidBy", select: "name" },
  { path: "inventoryItem", select: "name quantity unit" },
];

export async function listInventoryPurchases(req, res) {
  const purchases = await InventoryPurchase.find().populate(PURCHASE_POPULATE).sort({ createdAt: -1 });
  res.json({ purchases });
}

// Entry Master/Co-Admin/Admin: request a purchase — what to buy, how much,
// and its cost. Goes straight to the Accountant to pay and confirm.
export async function createInventoryPurchase(req, res) {
  const { itemName, quantity, unit, amount, paymentMethod, notes } = req.body;
  if (!itemName || !quantity || !amount) {
    return res.status(400).json({ message: "itemName, quantity and amount are required" });
  }

  const purchase = await InventoryPurchase.create({
    itemName,
    quantity,
    unit,
    amount,
    paymentMethod: ["cash", "online", "upi", "bank_transfer", "cheque"].includes(paymentMethod)
      ? paymentMethod
      : "cash",
    notes,
    requestedBy: req.user._id,
  });

  await notifyAccountants({
    title: "New inventory purchase request",
    message: `${req.user.name} requested ${quantity} ${unit || ""} of "${itemName}" (₹${amount}).`.replace(/\s+/g, " "),
    type: "inventory_purchase",
    link: "/accountant/inventory-payments",
  });

  const populated = await InventoryPurchase.findById(purchase._id).populate(PURCHASE_POPULATE);
  res.status(201).json({ purchase: populated });
}

// Accountant: pays for the purchase (uploading their own proof) — this one
// action both settles the payment and confirms the request, which is what
// adds the quantity to the matching InventoryItem's stock.
export async function payInventoryPurchase(req, res) {
  const { id } = req.params;
  const { proofUrl } = req.body;

  const purchase = await InventoryPurchase.findById(id);
  if (!purchase) return res.status(404).json({ message: "Inventory purchase not found" });
  if (purchase.status !== "pending_payment") {
    return res.status(400).json({ message: "Only pending purchases can be paid" });
  }

  purchase.status = "paid";
  purchase.paidBy = req.user._id;
  purchase.paidAt = new Date();
  purchase.proofUrl = proofUrl || null;

  let item = await InventoryItem.findOne({ name: new RegExp(`^${purchase.itemName.trim()}$`, "i") });
  if (item) {
    item.totalReceived += purchase.quantity;
    item.quantity += purchase.quantity;
    if (!item.unit && purchase.unit) item.unit = purchase.unit;
  } else {
    item = new InventoryItem({
      name: purchase.itemName,
      unit: purchase.unit,
      quantity: purchase.quantity,
      totalReceived: purchase.quantity,
    });
  }
  item.updatedBy = req.user._id;
  await item.save();

  purchase.inventoryItem = item._id;
  await purchase.save();

  await LedgerEntry.create({
    mode: purchase.paymentMethod === "cash" ? "cash" : "online",
    direction: "sent",
    amount: purchase.amount,
    party: purchase.itemName,
    description: `Inventory purchase — ${purchase.quantity} ${purchase.unit || ""} of "${purchase.itemName}"`.replace(/\s+/g, " "),
    relatedInventoryPurchase: purchase._id,
    recordedBy: req.user._id,
    proofUrl,
  });

  await recordAudit({
    user: req.user,
    action: "inventoryPurchase.pay",
    entityType: "InventoryPurchase",
    entityId: purchase._id,
    before: { status: "pending_payment" },
    after: { status: purchase.status, amount: purchase.amount },
  });

  await notifyUser(purchase.requestedBy, {
    title: "Inventory purchase paid",
    message: `Your request for "${purchase.itemName}" has been paid and added to stock.`,
    type: "inventory_purchase",
    link: "/entry-master/inventory-requests",
  });

  const populated = await InventoryPurchase.findById(purchase._id).populate(PURCHASE_POPULATE);
  res.json({ purchase: populated });
}

export async function rejectInventoryPurchase(req, res) {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const purchase = await InventoryPurchase.findById(id);
  if (!purchase) return res.status(404).json({ message: "Inventory purchase not found" });
  if (purchase.status !== "pending_payment") {
    return res.status(400).json({ message: "Only pending purchases can be rejected" });
  }

  purchase.status = "rejected";
  purchase.rejectionReason = rejectionReason || "Rejected by Accountant";
  await purchase.save();

  await recordAudit({
    user: req.user,
    action: "inventoryPurchase.reject",
    entityType: "InventoryPurchase",
    entityId: purchase._id,
    before: { status: "pending_payment" },
    after: { status: purchase.status, rejectionReason: purchase.rejectionReason },
  });

  await notifyUser(purchase.requestedBy, {
    title: "Inventory purchase rejected",
    message: `Your request for "${purchase.itemName}" was rejected: ${purchase.rejectionReason}`,
    type: "inventory_purchase",
    link: "/entry-master/inventory-requests",
  });

  res.json({ purchase });
}
