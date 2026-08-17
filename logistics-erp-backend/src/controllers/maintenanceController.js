const asyncHandler = require("express-async-handler");
const { Maintenance } = require("../models");
const { getFileUrl } = require("../middlewares/upload");
const { getPagination, paginationMeta } = require("../utils/api");

const getMaintenances = asyncHandler(async (req, res) => {
  const { status, vehicleId, priority } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const where = {};
  if (status) where.status = status;
  if (vehicleId) where.vehicle = vehicleId;
  if (priority) where.priority = priority;

  const [rows, count] = await Promise.all([
    Maintenance.find(where)
      .populate("vehicle", "vehicleNo")
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit),
    Maintenance.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

const getMaintenance = asyncHandler(async (req, res) => {
  const record = await Maintenance.findById(req.params.id).populate("vehicle", "vehicleNo");
  if (!record) {
    res.status(404);
    throw new Error("Maintenance record not found");
  }
  res.json({ success: true, data: record });
});

const createMaintenance = asyncHandler(async (req, res) => {
  const { vehicleId, ...body } = req.body;
  const record = await Maintenance.create({
    ...body,
    vehicle: vehicleId || body.vehicle || undefined,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: record });
});

const updateMaintenance = asyncHandler(async (req, res) => {
  const { vehicleId, ...body } = req.body;
  const record = await Maintenance.findByIdAndUpdate(req.params.id, {
    ...body,
    ...(vehicleId !== undefined ? { vehicle: vehicleId || null } : {}),
  }, {
    new: true,
    runValidators: true,
  });
  if (!record) {
    res.status(404);
    throw new Error("Maintenance record not found");
  }
  res.json({ success: true, data: record });
});

const deleteMaintenance = asyncHandler(async (req, res) => {
  const record = await Maintenance.findByIdAndDelete(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Maintenance record not found");
  }
  res.json({ success: true, message: "Maintenance record deleted" });
});

// @route GET /api/maintenance/alerts
// Groups pending/upcoming/ongoing maintenance, plus items due within `days`
const getAlerts = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 15;
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  const [pending, upcoming, ongoing, dueSoon] = await Promise.all([
    Maintenance.find({ status: "pending" }).populate("vehicle", "vehicleNo"),
    Maintenance.find({ status: "upcoming" }).populate("vehicle", "vehicleNo"),
    Maintenance.find({ status: "ongoing" }).populate("vehicle", "vehicleNo"),
    Maintenance.find({
      status: { $nin: ["completed", "cancelled"] },
      nextDueDate: { $gte: today, $lte: future },
    }).populate("vehicle", "vehicleNo"),
  ]);

  res.json({
    success: true,
    data: { pending, upcoming, ongoing, dueSoon },
  });
});

const uploadInvoice = asyncHandler(async (req, res) => {
  const record = await Maintenance.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Maintenance record not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  record.invoiceUrl = url;
  await record.save();
  res.json({ success: true, data: { invoiceUrl: url } });
});

module.exports = {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getAlerts,
  uploadInvoice,
};
