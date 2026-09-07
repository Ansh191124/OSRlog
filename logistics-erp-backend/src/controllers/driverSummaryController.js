import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Payment from "../models/Payment.js";
import { ROLES } from "../config/roles.js";

// Aggregated driver info for Admin/Co-Admin's Drivers page: basic info, trip
// count, and paid-earnings total. Trip/Payment data is populated starting
// Phase 3/4 — this returns zeros until then, which is the correct state.
export async function listDriverSummaries(req, res) {
  const drivers = await User.find({ role: ROLES.DRIVER }).sort({ createdAt: -1 }).lean();

  const [tripCounts, earnings] = await Promise.all([
    Trip.aggregate([{ $match: { driver: { $ne: null } } }, { $group: { _id: "$driver", count: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$requestedBy", total: { $sum: "$amount" } } },
    ]),
  ]);

  const tripCountByDriver = new Map(tripCounts.map((t) => [String(t._id), t.count]));
  const earningsByDriver = new Map(earnings.map((e) => [String(e._id), e.total]));

  const result = drivers.map((d) => ({
    ...d,
    passwordHash: undefined,
    tripCount: tripCountByDriver.get(String(d._id)) || 0,
    totalEarnings: earningsByDriver.get(String(d._id)) || 0,
  }));

  res.json({ drivers: result });
}
