import Trip from "../models/Trip.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import LedgerEntry from "../models/LedgerEntry.js";
import LoadingSlip from "../models/LoadingSlip.js";
import Payment from "../models/Payment.js";
import InventoryPurchase from "../models/InventoryPurchase.js";
import { ROLES } from "../config/roles.js";

const RANGE_CONFIG = {
  daily: { format: "%Y-%m-%d", days: 14 },
  weekly: { format: "%G-W%V", days: 56 },
  monthly: { format: "%Y-%m", days: 365 },
  yearly: { format: "%Y", days: 365 * 5 },
};

// A Loading Slip's still-outstanding amount: before verification, nothing has
// actually hit the ledger yet — not even the "advance" — so the WHOLE
// totalAmount is pending. Only at verification does the advance get recorded
// as received (see loadingSlipController.verifyPayment); from then on, only
// the leftover "balance" (there's no later step that ever collects it) is
// still outstanding. Using `balance` for every status — the previous bug —
// undercounted unverified slips (missed the un-received advance) and dropped
// verified slips with a balance entirely, so "pending" never showed it all.
const LOADING_SLIP_PENDING_EXPR = { $cond: [{ $eq: ["$status", "verified"] }, "$balance", "$totalAmount"] };

// Money still in flight — not yet received from a client, or not yet paid
// out — grouped by the same date blocks as the P/L series so "pending" can
// sit alongside received/sent/net.
async function getPendingSeries(range, since) {
  const config = RANGE_CONFIG[range] || RANGE_CONFIG.daily;

  const [loadingSlipRows, paymentRows, purchaseRows] = await Promise.all([
    LoadingSlip.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $project: { createdAt: 1, pendingAmount: LOADING_SLIP_PENDING_EXPR } },
      { $group: { _id: { $dateToString: { format: config.format, date: "$createdAt" } }, amount: { $sum: "$pendingAmount" } } },
    ]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: ["pending_vehicle_master", "approved_by_vehicle_master"] } } },
      { $group: { _id: { $dateToString: { format: config.format, date: "$createdAt" } }, amount: { $sum: "$amount" } } },
    ]),
    InventoryPurchase.aggregate([
      { $match: { createdAt: { $gte: since }, status: "pending_payment" } },
      { $group: { _id: { $dateToString: { format: config.format, date: "$createdAt" } }, amount: { $sum: "$amount" } } },
    ]),
  ]);

  const map = {};
  for (const rows of [loadingSlipRows, paymentRows, purchaseRows]) {
    for (const r of rows) {
      map[r._id] = (map[r._id] || 0) + r.amount;
    }
  }
  return map;
}

// Current, un-windowed total of everything still pending — the admin
// dashboard's headline "Pending Amount" figure.
async function getTotalPendingAmount() {
  const [loadingSlipAgg, paymentAgg, purchaseAgg] = await Promise.all([
    LoadingSlip.aggregate([
      { $project: { pendingAmount: LOADING_SLIP_PENDING_EXPR } },
      { $group: { _id: null, total: { $sum: "$pendingAmount" } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: ["pending_vehicle_master", "approved_by_vehicle_master"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    InventoryPurchase.aggregate([
      { $match: { status: "pending_payment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    receivable: loadingSlipAgg[0]?.total || 0,
    payable: (paymentAgg[0]?.total || 0) + (purchaseAgg[0]?.total || 0),
    total: (loadingSlipAgg[0]?.total || 0) + (paymentAgg[0]?.total || 0) + (purchaseAgg[0]?.total || 0),
  };
}

// P/L is computed as actual cash movement (received - sent) from the ledger
// built in Phase 4 — the real financial system of record. Each block also
// carries its "pending" figure (money not yet received/paid in that block).
async function getPlSeries(range) {
  const config = RANGE_CONFIG[range] || RANGE_CONFIG.daily;
  const since = new Date(Date.now() - config.days * 24 * 60 * 60 * 1000);

  const [rows, pendingMap] = await Promise.all([
    LedgerEntry.aggregate([
      { $match: { date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: config.format, date: "$date" } },
          received: { $sum: { $cond: [{ $eq: ["$direction", "received"] }, "$amount", 0] } },
          sent: { $sum: { $cond: [{ $eq: ["$direction", "sent"] }, "$amount", 0] } },
        },
      },
    ]),
    getPendingSeries(range, since),
  ]);

  const byLabel = {};
  rows.forEach((r) => {
    byLabel[r._id] = { label: r._id, received: r.received, sent: r.sent };
  });
  Object.keys(pendingMap).forEach((label) => {
    if (!byLabel[label]) byLabel[label] = { label, received: 0, sent: 0 };
  });

  return Object.values(byLabel)
    .map((r) => ({ ...r, net: r.received - r.sent, pending: pendingMap[r.label] || 0 }))
    .sort((a, b) => (a.label > b.label ? 1 : -1));
}

async function getTripCounts() {
  const [running, completed, overall] = await Promise.all([
    Trip.countDocuments({ status: "running" }),
    Trip.countDocuments({ status: { $in: ["completed", "closed"] } }),
    Trip.countDocuments({}),
  ]);
  return { running, completed, overall };
}

async function getPeopleCounts() {
  const [employeeCount, driverCount] = await Promise.all([
    User.countDocuments({ role: ROLES.EMPLOYEE }),
    User.countDocuments({ role: ROLES.DRIVER }),
  ]);
  return { employeeCount, driverCount };
}

// Admin: P/L + graph, notifications (via /api/notifications), running/completed/
// overall trips, employee & driver counts — the full picture.
export async function adminOverview(req, res) {
  const range = ["daily", "weekly", "monthly", "yearly"].includes(req.query.range) ? req.query.range : "daily";

  const [plSeries, trips, people, pending] = await Promise.all([
    getPlSeries(range),
    getTripCounts(),
    getPeopleCounts(),
    getTotalPendingAmount(),
  ]);

  res.json({ range, plSeries, trips, pending, ...people });
}

// Co-Admin: everything except the total P/L figure (explicit doc restriction).
export async function coAdminOverview(req, res) {
  const [trips, people, vehicleStatusRows] = await Promise.all([
    getTripCounts(),
    getPeopleCounts(),
    Vehicle.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const vehicleStatus = { available: 0, on_trip: 0, maintenance: 0, inactive: 0 };
  vehicleStatusRows.forEach((r) => {
    vehicleStatus[r._id] = r.count;
  });

  res.json({
    runningTrips: trips.running,
    completedTrips: trips.completed,
    vehicleStatus,
    ...people,
  });
}
