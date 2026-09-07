import LorryReceipt from "../models/LorryReceipt.js";
import LRReservation from "../models/LRReservation.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { nextSequence } from "../models/Counter.js";
import { generateLrPdf } from "../utils/pdf.js";
import { uploadBuffer } from "../utils/s3.js";
import { getClientLrSummary } from "./reservationController.js";
import { notifyAdmins } from "../utils/notify.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { recordAudit } from "../utils/audit.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const LR_POPULATE = [
  { path: "client", select: "name email companyName gstin" },
  { path: "requestedBy", select: "name email" },
  { path: "approvedBy", select: "name" },
  { path: "loadingSlip", select: "slipNumber status totalAmount" },
];

// Claims the next number from the client's oldest approved reservation block
// that still has room, so a client's reserved LRs stay numbered contiguously
// (e.g. 20-30) no matter what temporary/walk-in LRs get created in between.
async function claimReservedLrNumber(clientId) {
  const reservation = await LRReservation.findOneAndUpdate(
    {
      client: clientId,
      status: "approved",
      nextNumber: { $ne: null },
      $expr: { $lte: ["$nextNumber", "$endNumber"] },
    },
    { $inc: { nextNumber: 1 } },
    { sort: { decidedAt: 1 }, new: false }
  );
  return reservation ? reservation.nextNumber : null;
}

export async function listLorryReceipts(req, res) {
  const filter = {};
  if (req.scope === ROLES.CLIENT) {
    filter.client = req.user._id;
  } else if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    const { fromLocation } = req.query;
    // Only LRs whose Loading Slip payment has been Accountant-verified are ready
    // for vehicle assignment — see LoadingSlip.verifyPayment.
    filter.status = "approved";
    filter.loadingSlip = { $ne: null };
    if (fromLocation) {
      // A running trip has physically reached this location — any eligible LR
      // starting here can be added as its next leg, regardless of which
      // Vehicle Master's own fleet is normally based there.
      filter.fromLocation = new RegExp(`^${escapeRegex(fromLocation.trim())}$`, "i");
    } else {
      // Default "Pending Assignment" view: only LRs starting at one of this
      // Vehicle Master's own vehicles' base locations.
      const myLocations = await Vehicle.find({ assignedVehicleMaster: req.user._id }).distinct("baseLocation");
      filter.fromLocation = { $in: myLocations.filter(Boolean) };
    }
  }

  const sortField = req.query.sortBy === "lrNumber" ? "lrNumber" : "createdAt";
  const sortDir = req.query.order === "asc" ? 1 : -1;

  const lorryReceipts = await LorryReceipt.find(filter)
    .populate(LR_POPULATE)
    .sort({ [sortField]: sortDir });
  res.json({ lorryReceipts });
}

export async function getLorryReceipt(req, res) {
  const { id } = req.params;
  const lorryReceipt = await LorryReceipt.findById(id).populate(LR_POPULATE);
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });

  if (req.scope === ROLES.CLIENT && String(lorryReceipt.client?._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your Lorry Receipt" });
  }

  res.json({ lorryReceipt });
}

// Client creates their own LR request; Co-Admin/Admin create one on behalf of
// a client (auto-approved, since they hold approval authority themselves), or
// a temporary/walk-in one with no client at all (isTemporary — Admin/Co-Admin
// only, skips the reservation-quota check entirely).
// No payment/freight fields are accepted here — those live on the Loading
// Slip, created separately by Co-Admin/Admin once this LR is approved.
export async function createLorryReceipt(req, res) {
  const { fromLocation, toLocation, goodsDescription, clientId, truckSizeFt, consignor, consignee, isTemporary } =
    req.body;

  if (!fromLocation || !toLocation) {
    return res.status(400).json({ message: "fromLocation and toLocation are required" });
  }
  if (!consignor?.name || !consignee?.name) {
    return res.status(400).json({ message: "Consignor and Consignee name are required" });
  }

  const isAdminLike = req.scope === ROLES.ADMIN || req.scope === ROLES.CO_ADMIN;
  const isTemporaryTrip = isTemporary && isAdminLike;

  let client = null;
  const isSelfService = req.scope === ROLES.CLIENT;
  if (!isTemporaryTrip) {
    if (isSelfService) {
      client = req.user;
    } else {
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      client = await User.findOne({ _id: clientId, role: ROLES.CLIENT });
      if (!client) return res.status(404).json({ message: "Client not found" });
    }

    const summary = await getClientLrSummary(client._id);
    if (summary.left <= 0) {
      return res.status(400).json({
        message: `${isSelfService ? "You have" : "This client has"} no reserved LR quota left. Reserve more LRs first.`,
      });
    }
  }

  let lrNumber;
  if (isTemporaryTrip) {
    lrNumber = await nextSequence("LR");
  } else {
    lrNumber = await claimReservedLrNumber(client._id);
    if (lrNumber == null) {
      return res.status(400).json({
        message: `${isSelfService ? "You have" : "This client has"} no reserved LR numbers left. Reserve more LRs first.`,
      });
    }
  }
  const billNumber = await nextSequence("BILL");
  const lorryReceipt = await LorryReceipt.create({
    lrNumber,
    billNumber,
    client: client?._id || null,
    requestedBy: req.user._id,
    isTemporary: Boolean(isTemporaryTrip),
    fromLocation,
    toLocation,
    goodsDescription,
    truckSizeFt: truckSizeFt || null,
    consignor: { name: consignor.name, address: consignor.address },
    consignee: { name: consignee.name, address: consignee.address },
    status: isSelfService ? "requested" : "approved",
    approvedBy: isSelfService ? null : req.user._id,
  });

  if (isSelfService) {
    await notifyAdmins({
      title: "New Lorry Receipt request",
      message: `${client.name} requested LR #${lrNumber} (${fromLocation} → ${toLocation}).`,
      type: "lorry_receipt",
      link: "/admin/lr-approval",
    });
  }

  const populated = await LorryReceipt.findById(lorryReceipt._id).populate(LR_POPULATE);
  res.status(201).json({ lorryReceipt: populated });
}

// Admin/Co-Admin approve or reject a client-submitted LR request. Approval no
// longer makes the LR vehicle-assignable by itself — a Loading Slip still
// needs to be created and its payment verified first (see LoadingSlip flow).
export async function decideLorryReceipt(req, res) {
  const { id } = req.params;
  const { decision } = req.body;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
  }

  const lorryReceipt = await LorryReceipt.findById(id);
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });
  if (lorryReceipt.status !== "requested") {
    return res.status(400).json({ message: "Only pending LR requests can be decided" });
  }

  lorryReceipt.status = decision;
  lorryReceipt.approvedBy = req.user._id;
  await lorryReceipt.save();

  await recordAudit({
    user: req.user,
    action: "lorryReceipt.decide",
    entityType: "LorryReceipt",
    entityId: lorryReceipt._id,
    before: { status: "requested" },
    after: { status: decision },
  });

  res.json({ lorryReceipt });
}

export async function downloadLorryReceiptPdf(req, res) {
  const { id } = req.params;
  const lorryReceipt = await LorryReceipt.findById(id).populate(LR_POPULATE);
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });

  if (req.scope === ROLES.CLIENT && String(lorryReceipt.client?._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your Lorry Receipt" });
  }

  const buffer = await generateLrPdf(lorryReceipt);
  const key = `lr/${lorryReceipt.lrNumber}.pdf`;
  await uploadBuffer(key, buffer, "application/pdf");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="LR-${lorryReceipt.lrNumber}.pdf"`);
  res.send(buffer);
}
