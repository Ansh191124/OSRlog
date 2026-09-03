const asyncHandler = require("express-async-handler");
const { Fleet, Trip, ApprovalRequest } = require("../models");

// LR's that still count against a fleet's quota - a rejected LR frees the slot back up.
const ACTIVE_LR_STATUSES = ["requested", "approved"];

const getFleets = asyncHandler(async (req, res) => {
  const where = req.user.role === "client" ? { $or: [{ clientUser: req.user._id }, { createdBy: req.user._id }] } : {};
  const rows = await Fleet.find(where).populate("clientUser", "name").populate("createdBy", "name").sort({ createdAt: -1 });

  const counts = await Trip.aggregate([
    { $match: { fleet: { $in: rows.map((f) => f._id) }, requestStatus: { $in: ACTIVE_LR_STATUSES } } },
    { $group: { _id: "$fleet", count: { $sum: 1 } } },
  ]);
  const usedById = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({ success: true, data: rows.map((f) => ({ ...f.toObject(), lrUsedCount: usedById.get(String(f._id)) || 0 })) });
});

const createFleet = asyncHandler(async (req, res) => {
  let { name, clientName, contactName, contactPhone, notes, reservedVehicleCount, reservationStartDate, reservationEndDate } = req.body;

  if (req.user.role === "client") {
    // Client identity always comes from the logged-in account — never from the form.
    clientName = req.user.name;
    contactName = req.user.name;
    contactPhone = req.user.phone || contactPhone;
    const count = Number(reservedVehicleCount || 0);
    if (count < 1) { res.status(400); throw new Error("Enter how many LR's you'd like to request"); }
    if (!name?.trim()) {
      name = `${req.user.name} — ${count} LR${count === 1 ? "" : "'s"}`;
    }
  } else if (!name || !clientName) {
    res.status(400);
    throw new Error("fleet name and client name are required");
  }

  const fleet = await Fleet.create({ name, clientName, contactName, contactPhone, notes, reservedVehicleCount: Number(reservedVehicleCount || 0), reservationStatus: Number(reservedVehicleCount || 0) > 0 ? "reserved" : "none", reservationStartDate: reservationStartDate || undefined, reservationEndDate: reservationEndDate || undefined, clientUser: req.user.role === "client" ? req.user._id : undefined, createdBy: req.user._id });

  // LR quota request workflow: quota created -> sent for admin approval.
  if (req.user.role === "client") {
    await ApprovalRequest.create({
      requestType: "fleet_reservation",
      title: `LR quota request: ${name} (${fleet.reservedVehicleCount} LR's)`,
      amount: 0,
      fleet: fleet._id,
      details: `${clientName} requested a quota of ${fleet.reservedVehicleCount} LR('s).`,
      requestedBy: req.user._id,
    });
  }

  res.status(201).json({ success: true, data: fleet });
});

const updateFleet = asyncHandler(async (req, res) => {
  const fleet = await Fleet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!fleet) { res.status(404); throw new Error("Fleet not found"); }
  res.json({ success: true, data: fleet });
});

module.exports = { getFleets, createFleet, updateFleet };
