const asyncHandler = require("express-async-handler");
const { ApprovalRequest, Payment, InventoryItem } = require("../models");

const getRequests = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.requestType) where.requestType = req.query.requestType;
  if (req.user.role === "employee") where.requestedBy = req.user._id;
  const rows = await ApprovalRequest.find(where)
    .populate("requestedBy approvedBy paidBy", "name role")
    .populate("driver", "name")
    .populate("vehicle", "vehicleNo")
    .populate("maintenance", "maintenanceType")
    .populate("inventoryItem", "name")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

const createRequest = asyncHandler(async (req, res) => {
  const { requestType, title, amount, paymentType, paymentMode, driverId, vehicleId, maintenanceId, inventoryItemId, details } = req.body;
  if (!requestType || !title || amount === undefined || Number(amount) < 0) {
    res.status(400); throw new Error("request type, title and a valid amount are required");
  }
  const record = await ApprovalRequest.create({ requestType, title, amount: Number(amount), paymentType, paymentMode, driver: driverId, vehicle: vehicleId, maintenance: maintenanceId, inventoryItem: inventoryItemId, details, requestedBy: req.user._id });
  res.status(201).json({ success: true, data: record });
});

const approveRequest = asyncHandler(async (req, res) => {
  const record = await ApprovalRequest.findById(req.params.id);
  if (!record) { res.status(404); throw new Error("Approval request not found"); }
  if (record.status !== "requested") { res.status(400); throw new Error("Only requested items can be approved"); }
  record.status = "approved"; record.approvedBy = req.user._id; record.approvedAt = new Date();
  await record.save();
  res.json({ success: true, data: record });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const record = await ApprovalRequest.findById(req.params.id);
  if (!record) { res.status(404); throw new Error("Approval request not found"); }
  if (record.status !== "requested") { res.status(400); throw new Error("Only requested items can be rejected"); }
  record.status = "rejected"; record.rejectionReason = req.body.reason || "Rejected"; record.approvedBy = req.user._id; record.approvedAt = new Date();
  await record.save();
  res.json({ success: true, data: record });
});

const markPaid = asyncHandler(async (req, res) => {
  const record = await ApprovalRequest.findById(req.params.id);
  if (!record) { res.status(404); throw new Error("Approval request not found"); }
  if (record.status !== "approved") { res.status(400); throw new Error("Only approved items can be paid"); }
  const payment = await Payment.create({
    partyName: req.body.partyName || record.title, date: req.body.date || new Date(), direction: "paid",
    category: record.requestType === "maintenance" ? "maintenance" : record.requestType === "driver_payment" ? "advance" : "expense",
    paymentType: req.body.paymentType || record.paymentType, paymentMode: req.body.paymentMode || record.paymentMode,
    transactionRef: req.body.transactionRef, amount: record.amount, driver: record.driver, vehicle: record.vehicle,
    remark: `Paid against approval request: ${record.title}`, createdBy: req.user._id,
  });
  record.status = "paid"; record.payment = payment._id; record.paidBy = req.user._id; record.paidAt = new Date();
  if (record.requestType === "inventory_purchase" && record.inventoryItem) {
    await InventoryItem.findByIdAndUpdate(record.inventoryItem, { status: "available" });
  }
  await record.save();
  res.json({ success: true, data: record, payment });
});

module.exports = { getRequests, createRequest, approveRequest, rejectRequest, markPaid };
