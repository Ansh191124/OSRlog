const asyncHandler = require("express-async-handler");
const { Fleet, ApprovalRequest } = require("../models");

const getFleets = asyncHandler(async (req, res) => {
  const where = req.user.role === "client" ? { $or: [{ clientUser: req.user._id }, { createdBy: req.user._id }] } : {};
  const rows = await Fleet.find(where).populate("vehicles", "vehicleNo status").populate("assignedPerson", "name role").populate("clientUser", "name").populate("createdBy", "name").sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});
const createFleet = asyncHandler(async (req, res) => {
  const { name, clientName, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount } = req.body;
  if (!name || !clientName) { res.status(400); throw new Error("fleet name and client name are required"); }
  const fleet = await Fleet.create({ name, clientName, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount: Number(reservedVehicleCount || 0), reservationStatus: Number(reservedVehicleCount || 0) > 0 ? "reserved" : "none", clientUser: req.user.role === "client" ? req.user._id : undefined, createdBy: req.user._id });
  if (req.user.role === "client" && Number(reservedVehicleCount || 0) > 0) {
    await ApprovalRequest.create({
      requestType: "fleet_reservation",
      title: `Fleet reservation: ${name}`,
      amount: 0,
      details: `Client requested ${reservedVehicleCount} vehicle(s)${fleetCodeFrom ? `, range ${fleetCodeFrom}${fleetCodeTo ? `–${fleetCodeTo}` : ""}` : ""}. Fleet ID: ${fleet._id}`,
      requestedBy: req.user._id,
    });
  }
  res.status(201).json({ success: true, data: fleet });
});
const updateFleet = asyncHandler(async (req, res) => {
  const current = await Fleet.findById(req.params.id);
  if (!current) { res.status(404); throw new Error("Fleet not found"); }
  const isAdmin = ["admin", "co_admin"].includes(req.user.role);
  if (!isAdmin && String(current.clientUser) !== String(req.user._id)) {
    res.status(403); throw new Error("You can only update your own fleet request");
  }
  const allowed = isAdmin ? req.body : (({ name, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount }) => ({ name, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount }))(req.body);
  if (!isAdmin && allowed.reservedVehicleCount !== undefined) allowed.reservationStatus = "reserved";
  const fleet = await Fleet.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
  res.json({ success: true, data: fleet });
});
const assignFleet = asyncHandler(async (req, res) => {
  const fleet = await Fleet.findById(req.params.id);
  if (!fleet) { res.status(404); throw new Error("Fleet not found"); }
  fleet.assignedPerson = req.body.assignedPersonId || null;
  fleet.vehicles = Array.isArray(req.body.vehicleIds) ? req.body.vehicleIds : fleet.vehicles;
  if (req.body.clientUserId !== undefined) fleet.clientUser = req.body.clientUserId || null;
  if (req.body.reservationStatus) fleet.reservationStatus = req.body.reservationStatus;
  fleet.status = fleet.assignedPerson && fleet.vehicles.length ? "active" : "pending_assignment";
  await fleet.save();
  res.json({ success: true, data: fleet });
});
module.exports = { getFleets, createFleet, updateFleet, assignFleet };
