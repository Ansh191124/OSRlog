import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import LorryReceipt from "../models/LorryReceipt.js";
import LoadingSlip from "../models/LoadingSlip.js";
import LedgerEntry from "../models/LedgerEntry.js";
import User from "../models/User.js";
import { recordAudit } from "../utils/audit.js";
import { generateTripSheetPdf } from "../utils/pdf.js";
import { uploadBuffer, getFileUrl } from "../utils/s3.js";
import { notifyAccountants, notifyUser } from "../utils/notify.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const LR_LEG_POPULATE = {
  path: "lorryReceipt",
  select: "lrNumber billNumber fromLocation toLocation client status loadingSlip",
  populate: [
    { path: "client", select: "name companyName" },
    { path: "loadingSlip", select: "slipNumber totalAmount advance balance status" },
  ],
};

const TRIP_POPULATE = [
  { path: "vehicle", select: "registrationNumber" },
  { path: "driver", select: "name" },
  { path: "vehicleMaster", select: "name" },
  { path: "legs.lorryReceipt", select: LR_LEG_POPULATE.select, populate: LR_LEG_POPULATE.populate },
  { path: "legs.addedBy", select: "name" },
  { path: "legs.deliveredBy", select: "name" },
];

// Derived, read-only convenience fields — first leg's origin / last leg's destination.
function withDerivedRoute(tripDoc) {
  const obj = tripDoc.toObject ? tripDoc.toObject() : tripDoc;
  const legs = obj.legs || [];
  obj.fromLocation = legs[0]?.fromLocation || null;
  obj.toLocation = legs[legs.length - 1]?.toLocation || null;
  obj.allLegsDelivered = legs.length > 0 && legs.every((l) => l.deliveredAt);
  return obj;
}

// The Loading Slips behind every leg's LR, oldest first — used to compute
// (and, on verification, settle) this trip's outstanding balance.
async function getTripLoadingSlips(trip) {
  const lrIds = trip.legs.map((l) => l.lorryReceipt);
  const lrs = await LorryReceipt.find({ _id: { $in: lrIds } }).select("loadingSlip");
  const slipIds = lrs.map((l) => l.loadingSlip).filter(Boolean);
  if (slipIds.length === 0) return [];
  return LoadingSlip.find({ _id: { $in: slipIds } }).sort({ slipNumber: 1 });
}

async function getTripPendingBalance(trip) {
  const slips = await getTripLoadingSlips(trip);
  return slips.reduce((sum, s) => sum + (s.balance || 0), 0);
}

// Data-URI proof keys are already directly usable; a real S3 key needs signing.
async function withProofUrl(obj) {
  if (obj.closurePayment?.proofUrl) {
    obj.closurePayment.proofSignedUrl = await getFileUrl(obj.closurePayment.proofUrl);
  }
  return obj;
}

export async function listTrips(req, res) {
  const filter = {};
  if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    filter.vehicleMaster = req.user._id;
  } else if (req.scope === ROLES.DRIVER) {
    filter.driver = req.user._id;
  }

  const trips = await Trip.find(filter).populate(TRIP_POPULATE).sort({ createdAt: -1 });
  const results = await Promise.all(trips.map(withDerivedRoute).map(withProofUrl));
  res.json({ trips: results });
}

export async function getTrip(req, res) {
  const { id } = req.params;
  const trip = await Trip.findById(id).populate(TRIP_POPULATE);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  // trip is populated above, so vehicleMaster/driver are sub-documents — compare by ._id.
  const isOwnerVehicleMaster =
    req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER && String(trip.vehicleMaster?._id) === String(req.user._id);
  const isOwnerDriver = req.scope === ROLES.DRIVER && String(trip.driver?._id) === String(req.user._id);
  const isAdminLike = req.scope === ROLES.ADMIN || req.scope === ROLES.CO_ADMIN;
  const isAccountant = req.scope === EMPLOYEE_CATEGORIES.ACCOUNTANT;
  if (!isOwnerVehicleMaster && !isOwnerDriver && !isAdminLike && !isAccountant) {
    return res.status(403).json({ message: "Not authorized to view this trip" });
  }

  res.json({ trip: await withProofUrl(withDerivedRoute(trip)) });
}

// Vehicle Master: assign one of their own available vehicles (at the LR's
// start location) to an approved LR, creating the Trip with its first leg.
export async function assignVehicleToLorryReceipt(req, res) {
  const { lorryReceiptId, vehicleId, driverId } = req.body;
  if (!lorryReceiptId || !vehicleId) {
    return res.status(400).json({ message: "lorryReceiptId and vehicleId are required" });
  }

  const lorryReceipt = await LorryReceipt.findById(lorryReceiptId).populate("loadingSlip");
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });
  if (lorryReceipt.status !== "approved") {
    return res.status(400).json({ message: "Only approved Lorry Receipts can be assigned a vehicle" });
  }
  if (!lorryReceipt.loadingSlip) {
    return res.status(400).json({ message: "This LR's payment must be verified before a vehicle can be assigned" });
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || String(vehicle.assignedVehicleMaster) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your assigned vehicle" });
  }
  if (vehicle.status !== "available") {
    return res.status(400).json({ message: "Vehicle is not available" });
  }
  if ((vehicle.baseLocation || "").trim().toLowerCase() !== (lorryReceipt.fromLocation || "").trim().toLowerCase()) {
    return res.status(400).json({ message: "Vehicle's base location doesn't match this Lorry Receipt's start point" });
  }

  let driver = null;
  if (driverId) {
    driver = await User.findOne({ _id: driverId, role: ROLES.DRIVER });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
  }

  const trip = await Trip.create({
    vehicle: vehicle._id,
    driver: driver?._id || vehicle.currentDriver || null,
    vehicleMaster: req.user._id,
    createdBy: req.user._id,
    freightRate: lorryReceipt.loadingSlip.freightRate,
    status: "running",
    legs: [
      {
        lorryReceipt: lorryReceipt._id,
        fromLocation: lorryReceipt.fromLocation,
        toLocation: lorryReceipt.toLocation,
        freight: lorryReceipt.loadingSlip.freightRate,
        addedBy: req.user._id,
      },
    ],
    logs: [{ status: "running", note: "Trip started", updatedBy: req.user._id }],
  });

  lorryReceipt.status = "assigned";
  lorryReceipt.trip = trip._id;
  await lorryReceipt.save();

  vehicle.status = "on_trip";
  if (driver) vehicle.currentDriver = driver._id;
  await vehicle.save();

  await recordAudit({
    user: req.user,
    action: "trip.assignVehicle",
    entityType: "Trip",
    entityId: trip._id,
    before: null,
    after: {
      lorryReceipt: lorryReceipt._id,
      vehicle: vehicle._id,
      driver: driver?._id || vehicle.currentDriver || null,
      fromLocation: lorryReceipt.fromLocation,
      toLocation: lorryReceipt.toLocation,
    },
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.status(201).json({ trip: withDerivedRoute(populated) });
}

// Vehicle Master: "the vehicle master can add multiple LRs" to a running trip
// as it progresses through legs. The new LR's start point should continue
// from the trip's current location (the previous leg's destination).
export async function addLegToTrip(req, res) {
  const { id } = req.params;
  const { lorryReceiptId } = req.body;
  if (!lorryReceiptId) return res.status(400).json({ message: "lorryReceiptId is required" });

  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.vehicleMaster) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your trip" });
  }
  if (trip.status !== "running") {
    return res.status(400).json({ message: "Only a running trip can have legs added" });
  }

  const lorryReceipt = await LorryReceipt.findById(lorryReceiptId).populate("loadingSlip");
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });
  if (lorryReceipt.status !== "approved") {
    return res.status(400).json({ message: "Only approved Lorry Receipts can be added" });
  }
  if (!lorryReceipt.loadingSlip) {
    return res.status(400).json({ message: "This LR's payment must be verified before it can be added" });
  }

  const currentLocation = trip.legs[trip.legs.length - 1]?.toLocation || "";
  if (currentLocation.trim().toLowerCase() !== (lorryReceipt.fromLocation || "").trim().toLowerCase()) {
    return res.status(400).json({
      message: `This LR starts from "${lorryReceipt.fromLocation}", but the trip is currently at "${currentLocation}".`,
    });
  }

  trip.legs.push({
    lorryReceipt: lorryReceipt._id,
    fromLocation: lorryReceipt.fromLocation,
    toLocation: lorryReceipt.toLocation,
    freight: lorryReceipt.loadingSlip.freightRate,
    addedBy: req.user._id,
  });
  await trip.save();

  lorryReceipt.status = "assigned";
  lorryReceipt.trip = trip._id;
  await lorryReceipt.save();

  await recordAudit({
    user: req.user,
    action: "trip.addLeg",
    entityType: "Trip",
    entityId: trip._id,
    before: null,
    after: { lorryReceipt: lorryReceipt._id, fromLocation: lorryReceipt.fromLocation, toLocation: lorryReceipt.toLocation },
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.status(201).json({ trip: withDerivedRoute(populated) });
}

// Vehicle Master marks one leg's LR as delivered, independent of the overall trip closure.
export async function markLegDelivered(req, res) {
  const { id, legId } = req.params;
  const { odometerReading, advance } = req.body;

  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.vehicleMaster) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your trip" });
  }

  const leg = trip.legs.id(legId);
  if (!leg) return res.status(404).json({ message: "Leg not found" });
  if (leg.deliveredAt) return res.status(400).json({ message: "This leg is already delivered" });

  if (odometerReading !== undefined) leg.odometerReading = odometerReading;
  if (advance !== undefined) leg.advance = advance;
  leg.deliveredAt = new Date();
  leg.deliveredBy = req.user._id;
  await trip.save();

  await LorryReceipt.findByIdAndUpdate(leg.lorryReceipt, { status: "used" });

  await recordAudit({
    user: req.user,
    action: "trip.legDelivered",
    entityType: "Trip",
    entityId: trip._id,
    before: { legId: leg._id, deliveredAt: null },
    after: { legId: leg._id, deliveredAt: leg.deliveredAt, odometerReading: leg.odometerReading, advance: leg.advance },
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.json({ trip: withDerivedRoute(populated) });
}

// Vehicle Master fills operational fields on their own running trip.
// Admin/Co-Admin may edit any trip field at any time (audited).
export async function updateTrip(req, res) {
  const { id } = req.params;
  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  const isOwnerVehicleMaster =
    req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER && String(trip.vehicleMaster) === String(req.user._id);
  const isAdminLike = req.scope === ROLES.ADMIN || req.scope === ROLES.CO_ADMIN;

  if (!isOwnerVehicleMaster && !isAdminLike) {
    return res.status(403).json({ message: "Not authorized to edit this trip" });
  }
  if (isOwnerVehicleMaster && trip.status !== "running") {
    return res.status(400).json({ message: "Only running trips can be updated" });
  }

  const before = trip.toObject();
  const {
    dieselLiters,
    dieselPricePerLiter,
    distanceKm,
    gpsKm,
    lrRate,
    freightRate,
    expenses,
    driver,
    startDate,
    endDate,
    timeIn,
    timeOut,
  } = req.body;

  if (dieselLiters !== undefined) trip.dieselLiters = dieselLiters;
  if (dieselPricePerLiter !== undefined) trip.dieselPricePerLiter = dieselPricePerLiter;
  if (distanceKm !== undefined) trip.distanceKm = distanceKm;
  if (gpsKm !== undefined) trip.gpsKm = gpsKm;
  if (lrRate !== undefined) trip.lrRate = lrRate;
  if (freightRate !== undefined) trip.freightRate = freightRate;
  if (expenses !== undefined) trip.expenses = expenses;
  if (driver !== undefined) trip.driver = driver || null;
  if (startDate !== undefined) trip.startDate = startDate;
  if (endDate !== undefined) trip.endDate = endDate;
  if (timeIn !== undefined) trip.timeIn = timeIn;
  if (timeOut !== undefined) trip.timeOut = timeOut;

  await trip.save();

  if (isAdminLike) {
    await recordAudit({
      user: req.user,
      action: "trip.update",
      entityType: "Trip",
      entityId: trip._id,
      before,
      after: trip.toObject(),
    });
  }

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.json({ trip: withDerivedRoute(populated) });
}

// Vehicle Master closes their own running trip -> completed. Every leg must
// already be delivered. GR generation is now a separate, client-scoped action
// (see goodsReceiptController) — closing a trip no longer creates one.
// Shared "actually complete the trip" step — used both by a direct close
// (nothing owed) and once an Accountant verifies a closing payment.
async function completeTrip(trip, user, note) {
  trip.status = "completed";
  trip.closedBy = user._id;
  trip.closedAt = new Date();
  trip.endDate = trip.endDate || new Date();
  trip.logs.push({ status: "completed", note, updatedBy: user._id });
  await trip.save();

  const vehicle = await Vehicle.findById(trip.vehicle);
  if (vehicle) {
    vehicle.status = "available";
    await vehicle.save();
  }
}

export async function closeTrip(req, res) {
  const { id } = req.params;
  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  if (String(trip.vehicleMaster) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your trip" });
  }
  if (trip.status !== "running") {
    return res.status(400).json({ message: "Only a running trip can be closed" });
  }
  if (trip.legs.length === 0 || !trip.legs.every((l) => l.deliveredAt)) {
    return res.status(400).json({ message: "Every leg must be marked delivered before closing the trip" });
  }

  const pendingBalance = await getTripPendingBalance(trip);
  if (pendingBalance > 0) {
    return res.status(400).json({
      message: `This trip still has a ₹${pendingBalance} pending balance — submit the closing payment for Accountant verification first.`,
      pendingBalance,
    });
  }

  await completeTrip(trip, req.user, "Trip closed");

  await recordAudit({
    user: req.user,
    action: "trip.close",
    entityType: "Trip",
    entityId: trip._id,
    before: { status: "running" },
    after: { status: trip.status, endDate: trip.endDate },
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.json({ trip: withDerivedRoute(populated) });
}

// Vehicle Master: once every leg is delivered, if the trip's LRs still carry
// an outstanding Loading Slip balance, report what the client actually paid
// at delivery — same cash-skips-proof rule as the Loading Slip flow. The
// trip stays "running" until an Accountant verifies it.
export async function submitClosingPayment(req, res) {
  const { id } = req.params;
  const { amount, paymentMethod, proofUrl } = req.body;

  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (String(trip.vehicleMaster) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your trip" });
  }
  if (trip.status !== "running") {
    return res.status(400).json({ message: "Only a running trip can submit a closing payment" });
  }
  if (trip.legs.length === 0 || !trip.legs.every((l) => l.deliveredAt)) {
    return res.status(400).json({ message: "Every leg must be marked delivered before closing the trip" });
  }
  if (trip.closurePayment?.status === "pending_verification") {
    return res.status(400).json({ message: "A closing payment for this trip is already awaiting verification" });
  }

  const pendingBalance = await getTripPendingBalance(trip);
  if (pendingBalance <= 0) {
    return res.status(400).json({ message: "Nothing is pending on this trip — use Close Trip directly" });
  }

  const method = ["cash", "online", "upi", "bank_transfer", "cheque"].includes(paymentMethod) ? paymentMethod : "cash";
  if (method !== "cash" && !proofUrl) {
    return res.status(400).json({ message: "Payment proof is required for non-cash methods" });
  }
  const amountPaid = Number(amount) || 0;
  if (amountPaid <= 0) {
    return res.status(400).json({ message: "amount must be greater than 0" });
  }

  trip.closurePayment = {
    status: "pending_verification",
    amount: amountPaid,
    paymentMethod: method,
    proofUrl: proofUrl || null,
    submittedBy: req.user._id,
    submittedAt: new Date(),
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
  };
  trip.logs.push({
    status: "closure_payment_submitted",
    note: `Closing payment of ₹${amountPaid} submitted for verification`,
    updatedBy: req.user._id,
  });
  await trip.save();

  await notifyAccountants({
    title: "Trip closing payment submitted",
    message: `A ₹${amountPaid} closing payment is awaiting verification before this trip can close.`,
    type: "trip",
    link: "/accountant/trip-closures",
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.json({ trip: await withProofUrl(withDerivedRoute(populated)) });
}

// Accountant: confirm the Vehicle Master's reported closing payment actually
// reflects a real, received payment. Verifying settles that amount against
// the trip's Loading Slip balance(s) (oldest first), records it in the
// ledger, and finally closes the trip; rejecting sends it back for
// resubmission.
export async function verifyClosingPayment(req, res) {
  const { id } = req.params;
  const { decision, rejectionReason } = req.body;
  if (!["verified", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'verified' or 'rejected'" });
  }

  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  if (trip.closurePayment?.status !== "pending_verification") {
    return res.status(400).json({ message: "This trip has no closing payment awaiting verification" });
  }

  if (decision === "verified") {
    const slips = await getTripLoadingSlips(trip);
    let remaining = trip.closurePayment.amount;
    for (const slip of slips) {
      if (remaining <= 0) break;
      const applied = Math.min(slip.balance, remaining);
      if (applied <= 0) continue;
      slip.advance += applied;
      slip.balance -= applied;
      remaining -= applied;
      await slip.save();
    }

    trip.closurePayment.status = "verified";
    trip.closurePayment.verifiedBy = req.user._id;
    trip.closurePayment.verifiedAt = new Date();
    await completeTrip(trip, req.user, "Trip closed — closing payment verified");

    await LedgerEntry.create({
      mode: trip.closurePayment.paymentMethod === "cash" ? "cash" : "online",
      direction: "received",
      amount: trip.closurePayment.amount,
      party: "Trip closing balance",
      description: `Closing balance payment for trip ${trip._id}`,
      relatedTrip: trip._id,
      recordedBy: req.user._id,
      proofUrl: trip.closurePayment.proofUrl,
    });

    await notifyUser(trip.vehicleMaster, {
      title: "Trip closing payment verified",
      message: "Your trip's closing payment was verified — the trip is now closed.",
      type: "trip",
      link: `/trips/${trip._id}`,
    });
  } else {
    trip.closurePayment.status = "rejected";
    trip.closurePayment.rejectionReason = rejectionReason || "Payment could not be verified";
    trip.logs.push({
      status: "closure_payment_rejected",
      note: trip.closurePayment.rejectionReason,
      updatedBy: req.user._id,
    });
    await trip.save();

    await notifyUser(trip.vehicleMaster, {
      title: "Trip closing payment rejected",
      message: `${trip.closurePayment.rejectionReason}. Please resubmit.`,
      type: "trip",
      link: `/trips/${trip._id}`,
    });
  }

  await recordAudit({
    user: req.user,
    action: "trip.verifyClosingPayment",
    entityType: "Trip",
    entityId: trip._id,
    before: { status: "pending_verification" },
    after: { status: trip.closurePayment.status },
  });

  const populated = await Trip.findById(trip._id).populate(TRIP_POPULATE);
  res.json({ trip: await withProofUrl(withDerivedRoute(populated)) });
}

// "The trip log should look like and contain all components of the uploaded
// Trip sheet when downloaded."
export async function downloadTripSheetPdf(req, res) {
  const { id } = req.params;
  const trip = await Trip.findById(id).populate(TRIP_POPULATE);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  const buffer = await generateTripSheetPdf(trip);
  const key = `trip-sheets/${trip._id}.pdf`;
  await uploadBuffer(key, buffer, "application/pdf");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="TripSheet-${trip.vehicle?.registrationNumber || trip._id}.pdf"`);
  res.send(buffer);
}

// Admin/Co-Admin only, per the doc's explicit restriction. Audited.
export async function deleteTrip(req, res) {
  const { id } = req.params;
  const trip = await Trip.findById(id);
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  await recordAudit({
    user: req.user,
    action: "trip.delete",
    entityType: "Trip",
    entityId: trip._id,
    before: trip.toObject(),
    after: null,
  });

  await Trip.deleteOne({ _id: trip._id });
  res.json({ success: true });
}
