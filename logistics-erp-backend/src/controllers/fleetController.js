const asyncHandler = require("express-async-handler");
const { Fleet } = require("../models");

const getFleets = asyncHandler(async (req, res) => {
  const where = req.user.role === "client" ? { $or: [{ clientUser: req.user._id }, { createdBy: req.user._id }] } : {};
  const rows = await Fleet.find(where).populate("vehicles", "vehicleNo status").populate("assignedPerson", "name role").populate("clientUser", "name").populate("createdBy", "name").sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});
const createFleet = asyncHandler(async (req, res) => {
  const { name, clientName, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount } = req.body;
  if (!name || !clientName) { res.status(400); throw new Error("fleet name and client name are required"); }
  const fleet = await Fleet.create({ name, clientName, contactName, contactPhone, notes, fleetCodeFrom, fleetCodeTo, reservedVehicleCount: Number(reservedVehicleCount || 0), reservationStatus: Number(reservedVehicleCount || 0) > 0 ? "reserved" : "none", clientUser: req.user.role === "client" ? req.user._id : undefined, createdBy: req.user._id });
  res.status(201).json({ success: true, data: fleet });
});
const updateFleet = asyncHandler(async (req, res) => {
  const fleet = await Fleet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!fleet) { res.status(404); throw new Error("Fleet not found"); }
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
