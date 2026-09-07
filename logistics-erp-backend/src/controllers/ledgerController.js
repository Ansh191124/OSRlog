import LedgerEntry from "../models/LedgerEntry.js";
import Payment from "../models/Payment.js";
import { ROLES } from "../config/roles.js";

// Cashbook (mode=cash) / Cashless book (mode=online) / Admin Payment Logs (no mode filter).
// Doc: Accountant sees "Received, Sent, Pending of every one[,] not other
// accountant['s] Transaction" — so an accountant's own ledger view is scoped
// to entries THEY recorded; Admin's Payment Logs sees everything.
export async function listLedger(req, res) {
  const filter = {};
  const { mode } = req.query;
  if (mode === "cash" || mode === "online") filter.mode = mode;

  if (req.scope !== ROLES.ADMIN) {
    filter.recordedBy = req.user._id;
  }

  const entries = await LedgerEntry.find(filter)
    .populate("recordedBy", "name")
    .populate("relatedPayment", "reason amount")
    .populate("relatedLoadingSlip", "slipNumber")
    .populate("relatedInventoryPurchase", "itemName quantity")
    .sort({ date: -1 });
  res.json({ entries });
}

export async function createLedgerEntry(req, res) {
  const { mode, direction, amount, party, description, proofUrl } = req.body;
  if (!mode || !direction || !amount) {
    return res.status(400).json({ message: "mode, direction and amount are required" });
  }
  if (!["cash", "online"].includes(mode)) {
    return res.status(400).json({ message: "mode must be 'cash' or 'online'" });
  }
  if (!["received", "sent"].includes(direction)) {
    return res.status(400).json({ message: "direction must be 'received' or 'sent'" });
  }

  const entry = await LedgerEntry.create({
    mode,
    direction,
    amount,
    party,
    description,
    proofUrl,
    recordedBy: req.user._id,
  });
  res.status(201).json({ entry });
}

export async function updateLedgerEntry(req, res) {
  const { id } = req.params;
  const entry = await LedgerEntry.findById(id);
  if (!entry) return res.status(404).json({ message: "Entry not found" });
  if (String(entry.recordedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only edit entries you recorded" });
  }

  const { amount, party, description, proofUrl } = req.body;
  if (amount !== undefined) entry.amount = amount;
  if (party !== undefined) entry.party = party;
  if (description !== undefined) entry.description = description;
  if (proofUrl !== undefined) entry.proofUrl = proofUrl;

  await entry.save();
  res.json({ entry });
}

// Accountant Overview: received/sent totals (own entries only) + system-wide
// pending count (requests any accountant can still claim).
export async function accountantOverview(req, res) {
  const [received, sent, pending] = await Promise.all([
    LedgerEntry.aggregate([
      { $match: { recordedBy: req.user._id, direction: "received" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { recordedBy: req.user._id, direction: "sent" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.countDocuments({ status: "approved_by_vehicle_master" }),
  ]);

  res.json({
    received: received[0]?.total || 0,
    sent: sent[0]?.total || 0,
    pending,
  });
}
