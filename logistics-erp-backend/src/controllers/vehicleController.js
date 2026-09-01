const asyncHandler = require("express-async-handler");
const { Vehicle, Driver } = require("../models");
const { getFileUrl } = require("../middlewares/upload");
const { getPagination, paginationMeta } = require("../utils/api");

const getVehicles = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const where = {};
  if (req.user.role === "employee") where.assignedEmployee = req.user._id;
  if (status) where.status = status;
  if (search) {
    where.$or = [
      { vehicleNo: { $regex: search, $options: "i" } },
      { modelName: { $regex: search, $options: "i" } },
      { chassisNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [rows, count] = await Promise.all([
    Vehicle.find(where).populate("assignedEmployee", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Vehicle.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id).populate("assignedEmployee", "name role");
  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }
  if (req.user.role === "employee" && String(vehicle.assignedEmployee?._id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This vehicle is not assigned to you");
  }
  const drivers = await Driver.find({ assignedVehicle: vehicle._id }).select("name phone");
  res.json({ success: true, data: { ...vehicle.toJSON(), drivers } });
});

const createVehicle = asyncHandler(async (req, res) => {
  if (!req.body.vehicleNo || !req.body.vehicleType || !req.body.modelName) {
    res.status(400);
    throw new Error("vehicle number, type and model are required");
  }
  const payload = { ...req.body, createdBy: req.user._id };
  const vehicle = await Vehicle.create(payload);
  res.status(201).json({ success: true, data: vehicle });
});

// Employees manage the day-to-day condition of the vehicles assigned to them
// (status, odometer, remark) but only an admin/co-admin can reassign a vehicle
// to a different employee or edit its mandatory identity fields.
const EMPLOYEE_EDITABLE_FIELDS = ["status", "remark", "currentOdometer"];

const updateVehicle = asyncHandler(async (req, res) => {
  const existing = await Vehicle.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Vehicle not found");
  }

  let payload = req.body;
  if (req.user.role === "employee") {
    if (String(existing.assignedEmployee) !== String(req.user._id)) {
      res.status(403);
      throw new Error("You can only update the status of vehicles assigned to you");
    }
    payload = Object.fromEntries(Object.entries(req.body).filter(([key]) => EMPLOYEE_EDITABLE_FIELDS.includes(key)));
  }

  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });
  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }
  res.json({ success: true, data: vehicle });
});

const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }
  res.json({ success: true, message: "Vehicle deleted" });
});

// Vehicles nearing document expiry - useful for dashboards/alerts
const getExpiringDocuments = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  const fields = ["rcExpiry", "insuranceExpiry", "permitExpiry", "fitnessExpiry", "pucExpiry"];
  const orConditions = fields.map((f) => ({ [f]: { $gte: today, $lte: future } }));

  const vehicles = await Vehicle.find({ $or: orConditions });
  res.json({ success: true, data: vehicles });
});

const uploadVehiclePhoto = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  vehicle.photoUrl = url;
  await vehicle.save();
  res.json({ success: true, data: { photoUrl: url } });
});

const uploadVehicleDoc = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  const docType = req.body.docType; // "rc" | "insurance"
  if (docType === "insurance") vehicle.insuranceDocUrl = url;
  else vehicle.rcDocUrl = url;
  await vehicle.save();
  res.json({ success: true, data: { url, docType: docType || "rc" } });
});

module.exports = {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getExpiringDocuments,
  uploadVehiclePhoto,
  uploadVehicleDoc,
};
