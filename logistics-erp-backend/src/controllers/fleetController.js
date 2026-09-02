const asyncHandler = require("express-async-handler");
const { Fleet, OrgSettings, ApprovalRequest } = require("../models");

// Parses a code like "FL1060" into { prefix: "FL", num: 1060 } for range comparisons.
const parseCode = (code) => {
  if (!code) return null;
  const match = String(code).trim().match(/^([A-Za-z]*)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1].toUpperCase(), num: Number(match[2]) };
};

// Checks a proposed [from, to] range against every existing reservation with the
// same prefix. Ranges may touch at a shared boundary (e.g. ...1060 ending one
// client's block and starting the next) but may not truly overlap. If both the
// new and an existing reservation carry a future reservation period, a vehicle
// range can be reused as long as those periods themselves don't overlap.
const findOverlappingFleet = async (fromCode, toCode, excludeId, startDate, endDate) => {
  const from = parseCode(fromCode);
  const to = parseCode(toCode);
  if (!from || !to || from.prefix !== to.prefix) return null;

  const newStart = startDate ? new Date(startDate) : null;
  const newEnd = endDate ? new Date(endDate) : null;

  const candidates = await Fleet.find({
    _id: excludeId ? { $ne: excludeId } : { $exists: true },
    fleetCodeFrom: { $exists: true, $ne: null, $ne: "" },
    fleetCodeTo: { $exists: true, $ne: null, $ne: "" },
    reservationStatus: { $in: ["reserved", "approved"] },
  });

  return candidates.find((f) => {
    const existingFrom = parseCode(f.fleetCodeFrom);
    const existingTo = parseCode(f.fleetCodeTo);
    if (!existingFrom || !existingTo || existingFrom.prefix !== from.prefix) return false;
    const rangeOverlaps = from.num < existingTo.num && to.num > existingFrom.num;
    if (!rangeOverlaps) return false;

    // Same vehicle range, but if both sides have a reservation period and those
    // periods don't overlap in time, it's a legitimate future re-reservation.
    if (newStart && newEnd && f.reservationStartDate && f.reservationEndDate) {
      const datesOverlap = newStart < new Date(f.reservationEndDate) && newEnd > new Date(f.reservationStartDate);
      return datesOverlap;
    }
    return true;
  }) || null;
};

// Finds the first contiguous, unreserved block of `count` serial slots inside
// the org's fleet pool (e.g. FL-1001..FL-2000), scanning in order so
// reservations stack up serially the way the workflow expects
// (client A gets 1004-1050, client B then starts right after at 1051+).
const allocateNextFleetRange = async (count) => {
  const settings = await OrgSettings.getSingleton();
  const { fleetPrefix, fleetRangeStart, fleetRangeEnd } = settings;

  const reserved = await Fleet.find({
    reservationStatus: { $in: ["reserved", "approved"] },
    fleetCodeFrom: { $exists: true, $ne: null, $ne: "" },
    fleetCodeTo: { $exists: true, $ne: null, $ne: "" },
  });
  const taken = new Set();
  reserved.forEach((f) => {
    const from = parseCode(f.fleetCodeFrom);
    const to = parseCode(f.fleetCodeTo);
    if (!from || !to || from.prefix !== fleetPrefix.toUpperCase()) return;
    for (let n = from.num; n <= to.num; n++) taken.add(n);
  });

  let runStart = null;
  for (let n = fleetRangeStart; n <= fleetRangeEnd; n++) {
    if (taken.has(n)) { runStart = null; continue; }
    if (runStart === null) runStart = n;
    if (n - runStart + 1 >= count) {
      return { from: `${fleetPrefix}${runStart}`, to: `${fleetPrefix}${runStart + count - 1}` };
    }
  }
  return null;
};

const getFleets = asyncHandler(async (req, res) => {
  const where = req.user.role === "client" ? { $or: [{ clientUser: req.user._id }, { createdBy: req.user._id }] } : {};
  const rows = await Fleet.find(where).populate("vehicles", "vehicleNo status").populate("assignedPerson", "name role").populate("clientUser", "name").populate("createdBy", "name").sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});
const createFleet = asyncHandler(async (req, res) => {
  let { name, clientName, contactName, contactPhone, notes, reservedVehicleCount, reservationStartDate, reservationEndDate } = req.body;
  let { fleetCodeFrom, fleetCodeTo } = req.body;

  if (req.user.role === "client") {
    // Client identity always comes from the logged-in account — never from the form.
    clientName = req.user.name;
    contactName = req.user.name;
    contactPhone = req.user.phone || contactPhone;
    const count = Number(reservedVehicleCount || 0);
    if (count < 1) { res.status(400); throw new Error("Enter how many vehicles you'd like to reserve"); }
    if (!name?.trim()) {
      name = `${req.user.name} — ${count} vehicle${count === 1 ? "" : "s"}`;
    }
    const allocated = await allocateNextFleetRange(count);
    if (!allocated) { res.status(409); throw new Error("No contiguous block of that size is available in the fleet pool right now"); }
    fleetCodeFrom = allocated.from;
    fleetCodeTo = allocated.to;
  } else {
    if (!name || !clientName) { res.status(400); throw new Error("fleet name and client name are required"); }
    if (fleetCodeFrom && fleetCodeTo) {
      const clash = await findOverlappingFleet(fleetCodeFrom, fleetCodeTo, null, reservationStartDate, reservationEndDate);
      if (clash) {
        res.status(409);
        throw new Error(`Vehicle range ${fleetCodeFrom}-${fleetCodeTo} overlaps an existing reservation (${clash.fleetCodeFrom}-${clash.fleetCodeTo}) for ${clash.clientName}`);
      }
    }
  }

  const fleet = await Fleet.create({ name, clientName, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount: Number(reservedVehicleCount || 0), reservationStatus: Number(reservedVehicleCount || 0) > 0 ? "reserved" : "none", reservationStartDate: reservationStartDate || undefined, reservationEndDate: reservationEndDate || undefined, clientUser: req.user.role === "client" ? req.user._id : undefined, createdBy: req.user._id });

  // Fleet Booking System workflow: fleet created -> sent for admin approval.
  if (req.user.role === "client") {
    await ApprovalRequest.create({
      requestType: "fleet_reservation",
      title: `Fleet reservation: ${name} (${fleetCodeFrom}-${fleetCodeTo})`,
      amount: 0,
      fleet: fleet._id,
      details: `${clientName} requested ${fleet.reservedVehicleCount} vehicle(s), auto-allocated ${fleetCodeFrom}-${fleetCodeTo}.`,
      requestedBy: req.user._id,
    });
  }

  res.status(201).json({ success: true, data: fleet });
});
const updateFleet = asyncHandler(async (req, res) => {
  if (req.body.fleetCodeFrom && req.body.fleetCodeTo) {
    const clash = await findOverlappingFleet(req.body.fleetCodeFrom, req.body.fleetCodeTo, req.params.id, req.body.reservationStartDate, req.body.reservationEndDate);
    if (clash) {
      res.status(409);
      throw new Error(`Vehicle range ${req.body.fleetCodeFrom}-${req.body.fleetCodeTo} overlaps an existing reservation (${clash.fleetCodeFrom}-${clash.fleetCodeTo}) for ${clash.clientName}`);
    }
  }
  const fleet = await Fleet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!fleet) { res.status(404); throw new Error("Fleet not found"); }
  res.json({ success: true, data: fleet });
});
const assignFleet = asyncHandler(async (req, res) => {
  const fleet = await Fleet.findById(req.params.id);
  if (!fleet) { res.status(404); throw new Error("Fleet not found"); }
  if (fleet.reservationStatus === "reserved") {
    res.status(400);
    throw new Error("This fleet reservation is still awaiting admin approval");
  }
  fleet.assignedPerson = req.body.assignedPersonId || req.user._id;
  fleet.vehicles = Array.isArray(req.body.vehicleIds) ? req.body.vehicleIds : fleet.vehicles;
  if (req.body.clientUserId !== undefined) fleet.clientUser = req.body.clientUserId || null;
  if (req.body.reservationStatus) fleet.reservationStatus = req.body.reservationStatus;
  fleet.status = fleet.assignedPerson && fleet.vehicles.length ? "active" : "pending_assignment";
  await fleet.save();
  res.json({ success: true, data: fleet });
});
module.exports = { getFleets, createFleet, updateFleet, assignFleet };
