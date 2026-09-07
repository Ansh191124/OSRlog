import LRReservation from "../models/LRReservation.js";
import LorryReceipt from "../models/LorryReceipt.js";
import { nextSequenceBlock } from "../models/Counter.js";
import { notifyAdmins } from "../utils/notify.js";
import { recordAudit } from "../utils/audit.js";
import { ROLES } from "../config/roles.js";

// Client's own reservation requests, or (Admin/Co-Admin) all requests.
export async function listReservations(req, res) {
  const filter = req.scope === ROLES.CLIENT ? { client: req.user._id } : {};
  const reservations = await LRReservation.find(filter).populate("client", "name email companyName").sort({ createdAt: -1 });
  res.json({ reservations });
}

export async function createReservation(req, res) {
  const { requestedCount } = req.body;
  const count = Number(requestedCount);
  if (!count || count < 1) {
    return res.status(400).json({ message: "requestedCount must be a positive number" });
  }

  const reservation = await LRReservation.create({ client: req.user._id, requestedCount: count });

  await notifyAdmins({
    title: "New LR reservation request",
    message: `${req.user.name} requested ${count} LR(s).`,
    type: "reservation",
    link: "/admin/lr-approval",
  });

  res.status(201).json({ reservation });
}

// Admin/Co-Admin approve or reject a reservation request.
export async function decideReservation(req, res) {
  const { id } = req.params;
  const { decision, approvedCount } = req.body;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
  }

  const reservation = await LRReservation.findById(id);
  if (!reservation) return res.status(404).json({ message: "Reservation not found" });
  if (reservation.status !== "pending") {
    return res.status(400).json({ message: "Reservation already decided" });
  }

  reservation.status = decision;
  reservation.decidedBy = req.user._id;
  reservation.decidedAt = new Date();

  if (decision === "approved") {
    const count = Number(approvedCount) || reservation.requestedCount;
    reservation.approvedCount = count;
    // Carve out a contiguous LR-number block for this reservation right now,
    // atomically advancing the global counter past it — any LR created after
    // this (e.g. a temporary/walk-in trip) will get the next number after
    // the whole block, never one from inside it.
    const startNumber = await nextSequenceBlock("LR", count);
    reservation.startNumber = startNumber;
    reservation.endNumber = startNumber + count - 1;
    reservation.nextNumber = startNumber;
  } else {
    reservation.approvedCount = 0;
  }

  await reservation.save();

  await recordAudit({
    user: req.user,
    action: "reservation.decide",
    entityType: "LRReservation",
    entityId: reservation._id,
    before: { status: "pending" },
    after: { status: reservation.status, approvedCount: reservation.approvedCount },
  });

  res.json({ reservation });
}

// Client's LR quota summary — used by the Client Overview page.
export async function getClientLrSummary(clientId) {
  const [reservations, lrCount] = await Promise.all([
    LRReservation.find({ client: clientId }),
    LorryReceipt.countDocuments({ client: clientId }),
  ]);

  const reservedTotal = reservations.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.approvedCount, 0);
  const requestedPending = reservations
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.requestedCount, 0);

  return {
    reserved: reservedTotal,
    used: lrCount,
    left: Math.max(reservedTotal - lrCount, 0),
    requested: requestedPending,
  };
}

export async function clientLrSummaryRoute(req, res) {
  const summary = await getClientLrSummary(req.user._id);
  res.json(summary);
}
