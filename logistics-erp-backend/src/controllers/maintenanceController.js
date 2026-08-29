const asyncHandler = require("express-async-handler");
const { Maintenance, InventoryItem, InventoryUsage, ApprovalRequest } = require("../models");
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
  const { vehicleId, inventoryUses = [], serviceType, dueDate, odometerDue, notes, ...body } = req.body;
  if (!Array.isArray(inventoryUses)) {
    res.status(400);
    throw new Error("inventoryUses must be a list of inventory items");
  }
  for (const use of inventoryUses) {
    if (!use.itemId || Number(use.quantity) <= 0) {
      res.status(400);
      throw new Error("Each inventory item needs an item and a positive quantity");
    }
    const item = await InventoryItem.findById(use.itemId);
    if (!item || item.quantity < Number(use.quantity)) {
      res.status(400);
      throw new Error("An inventory item is unavailable or has insufficient stock");
    }
  }
  const record = await Maintenance.create({
    ...body,
    vehicle: vehicleId || body.vehicle || undefined,
    maintenanceType: serviceType || body.maintenanceType,
    scheduledDate: dueDate || body.scheduledDate,
    nextDueOdometer: odometerDue || body.nextDueOdometer,
    remark: notes || body.remark,
    createdBy: req.user._id,
  });
  let inventoryCost = 0;
  for (const use of inventoryUses) {
    const quantity = Number(use.quantity);
    const item = await InventoryItem.findOneAndUpdate(
      { _id: use.itemId, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true }
    );
    if (!item) {
      res.status(400);
      throw new Error("Inventory changed while saving; please try again");
    }
    inventoryCost += quantity * item.unitCost;
    await InventoryUsage.create({ item: item._id, maintenance: record._id, quantity, unitCost: item.unitCost, notes: use.notes, createdBy: req.user._id });
  }
  if (inventoryCost) {
    record.inventoryCost = inventoryCost;
    await record.save();
  }
  const request = await ApprovalRequest.create({
    requestType: "maintenance", title: `Maintenance: ${record.maintenanceType || "service"}`,
    amount: Number(record.cost || 0) + inventoryCost, paymentType: req.body.paymentType || "cash", paymentMode: req.body.paymentMode || "cash",
    vehicle: record.vehicle, maintenance: record._id, details: record.description || record.remark, requestedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: record, request });
});

const updateMaintenance = asyncHandler(async (req, res) => {
  const { vehicleId, serviceType, dueDate, odometerDue, notes, inventoryUses, ...body } = req.body;
  if (inventoryUses !== undefined) {
    res.status(400);
    throw new Error("Inventory usage can only be recorded when creating a maintenance record");
  }
  const record = await Maintenance.findByIdAndUpdate(req.params.id, {
    ...body,
    ...(vehicleId !== undefined ? { vehicle: vehicleId || null } : {}),
    ...(serviceType !== undefined ? { maintenanceType: serviceType } : {}),
    ...(dueDate !== undefined ? { scheduledDate: dueDate || null } : {}),
    ...(odometerDue !== undefined ? { nextDueOdometer: odometerDue || null } : {}),
    ...(notes !== undefined ? { remark: notes } : {}),
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
