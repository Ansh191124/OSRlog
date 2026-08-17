const asyncHandler = require("express-async-handler");
const { Payment } = require("../models");
const { getFileUrl } = require("../middlewares/upload");
const { getPagination, paginationMeta, endOfDay } = require("../utils/api");

const getPayments = asyncHandler(async (req, res) => {
  const {
    paymentType, direction, category, vehicleId, driverId, tripId,
    from, to, search,
  } = req.query;

  const where = {};
  if (paymentType) where.paymentType = paymentType;
  if (direction) where.direction = direction;
  if (category) where.category = category;
  if (vehicleId) where.vehicle = vehicleId;
  if (driverId) where.driver = driverId;
  if (tripId) where.trip = tripId;
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
    .populate("driver", "name");
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }
  res.json({ success: true, data: payment });
});

const createPayment = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, driverId, ...body } = req.body;
  const payment = await Payment.create({
    ...body,
    trip: tripId || body.trip || undefined,
    vehicle: vehicleId || body.vehicle || undefined,
    driver: driverId || body.driver || undefined,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: payment });
});

const updatePayment = asyncHandler(async (req, res) => {
  const { tripId, vehicleId, driverId, ...body } = req.body;
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
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  payment.receiptUrl = url;
  await payment.save();
  res.json({ success: true, data: { receiptUrl: url } });
});

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  uploadReceipt,
};
