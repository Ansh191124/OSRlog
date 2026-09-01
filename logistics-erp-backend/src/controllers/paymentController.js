const asyncHandler = require("express-async-handler");
const { Payment, Fleet } = require("../models");
const { getFileUrl } = require("../middlewares/upload");
const { getPagination, paginationMeta, endOfDay } = require("../utils/api");

const getPayments = asyncHandler(async (req, res) => {
  const {
    paymentType, direction, category, vehicleId, driverId, tripId, fleetId,
    from, to, search,
  } = req.query;

  const where = {};
  // Clients only ever see the payments they themselves submitted (their fleet
  // reservations) - never the company-wide cashbook.
  if (req.user.role === "client") where.createdBy = req.user._id;
  if (paymentType) where.paymentType = paymentType;
  if (direction) where.direction = direction;
  if (category) where.category = category;
  if (vehicleId) where.vehicle = vehicleId;
  if (driverId) where.driver = driverId;
  if (tripId) where.trip = tripId;
  if (fleetId) where.fleet = fleetId;
  if (from || to) {
    where.date = {};
    if (from) where.date.$gte = new Date(from);
    if (to) where.date.$lte = endOfDay(to);
  }
  if (search) {
    where.$or = [
      { partyName: { $regex: search, $options: "i" } },
      { transactionRef: { $regex: search, $options: "i" } },
    ];
  }

  const { page, limit, skip } = getPagination(req.query);
  const [rows, count] = await Promise.all([
    Payment.find(where)
      .populate("trip", "tripCode")
      .populate("vehicle", "vehicleNo")
      .populate("driver", "name")
      .populate("fleet", "name clientName fleetCodeFrom fleetCodeTo")
      .populate("verifiedBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("trip", "tripCode")
    .populate("vehicle", "vehicleNo")
    .populate("driver", "name")
    .populate("fleet", "name clientName")
    .populate("verifiedBy", "name");
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  if (req.user.role === "client" && String(payment.createdBy) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this payment");
  }
  res.json({ success: true, data: payment });
});

const createPayment = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, driverId, fleetId, ...body } = req.body;

  let payload = { ...body };

  if (req.user.role === "client") {
    // A client can only ever submit a "fleet reservation payment" against a
    // fleet they own, and it always starts out pending accountant verification.
    if (!fleetId) { res.status(400); throw new Error("A fleet is required to submit a payment"); }
    const fleet = await Fleet.findById(fleetId);
    if (!fleet || String(fleet.clientUser) !== String(req.user._id)) {
      res.status(403);
      throw new Error("You can only submit payments for your own fleets");
    }
    if (!body.amount || Number(body.amount) <= 0) { res.status(400); throw new Error("Enter a valid payment amount"); }
    if (body.paymentType === "cash" && !body.paidToName) { res.status(400); throw new Error("Enter who you paid the cash to"); }

    payload = {
      ...payload,
      direction: "received",
      category: "fleet_reservation",
      status: "pending",
      partyName: payload.partyName || fleet.clientName,
      date: payload.date || new Date(),
    };
  }

  const payment = await Payment.create({
    ...payload,
    trip: tripId || payload.trip || undefined,
    vehicle: vehicleId || payload.vehicle || undefined,
    driver: driverId || payload.driver || undefined,
    fleet: fleetId || payload.fleet || undefined,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: payment });
});

const updatePayment = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, driverId, ...body } = req.body;

  if (req.user.role === "client") {
    const existing = await Payment.findById(req.params.id);
    if (!existing) { res.status(404); throw new Error("Payment not found"); }
    if (String(existing.createdBy) !== String(req.user._id) || existing.status !== "pending") {
      res.status(403);
      throw new Error("You can only edit your own payment while it's still pending verification");
    }
    // Clients can correct the amount/mode/evidence while pending, but can never set their own verification status.
    delete body.status; delete body.verifiedBy; delete body.verifiedAt;
  }

  const payment = await Payment.findByIdAndUpdate(req.params.id, {
    ...body,
    ...(tripId !== undefined ? { trip: tripId || null } : {}),
    ...(vehicleId !== undefined ? { vehicle: vehicleId || null } : {}),
    ...(driverId !== undefined ? { driver: driverId || null } : {}),
  }, {
    new: true,
    runValidators: true,
  });
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  res.json({ success: true, data: payment });
});

const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  res.json({ success: true, message: "Payment deleted" });
});

// @route GET /api/payments/summary
// Cash vs online totals, received vs paid, within optional date range
const getPaymentSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = {};
  if (req.user.role === "client") match.createdBy = req.user._id;
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = endOfDay(to);
  }

  const rows = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: { paymentType: "$paymentType", direction: "$direction" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    cash: { received: 0, paid: 0 },
    online: { received: 0, paid: 0 },
  };

  rows.forEach((r) => {
    const { paymentType, direction } = r._id;
    if (paymentType && direction && summary[paymentType]) {
      summary[paymentType][direction] = r.total || 0;
    }
  });

  res.json({ success: true, data: summary });
});

const uploadReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  if (req.user.role === "client" && String(payment.createdBy) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You can only attach a screenshot to your own payment");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  payment.receiptUrl = url;
  await payment.save();
  res.json({ success: true, data: { receiptUrl: url } });
});

// Accountant (or admin) reviews the client's evidence - screenshot for
// online, "paid to" name for cash - and marks the payment verified or rejected.
const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) { res.status(404); throw new Error("Payment not found"); }
  if (payment.status !== "pending") { res.status(400); throw new Error("Only pending payments can be verified"); }

  const approve = req.body.approve !== false;
  payment.status = approve ? "completed" : "failed";
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();
  if (!approve && req.body.reason) payment.remark = `${payment.remark ? payment.remark + " — " : ""}Rejected: ${req.body.reason}`;
  await payment.save();
  res.json({ success: true, data: payment });
});

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  uploadReceipt,
  verifyPayment,
};
