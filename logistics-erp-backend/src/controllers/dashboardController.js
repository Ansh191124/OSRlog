const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { Trip, Maintenance, Payment, Vehicle, Fleet } = require("../models");
const { endOfDay } = require("../utils/api");

// Maps a friendly period name to a MongoDB $dateTrunc unit
const PERIOD_TO_UNIT = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

const buildDateMatch = (from, to) => {
  const match = {};
  if (from || to) {
    match.startDate = {};
    if (from) match.startDate.$gte = new Date(from);
    if (to) match.startDate.$lte = endOfDay(to);
  }
  return match;
};

/**
 * @route GET /api/dashboard/summary?period=daily|weekly|monthly|yearly&from=&to=
 * Returns total freight, total expenses and net profit/loss for the given period,
 * bucketed by day/week/month/year, straight from each trip's embedded summary.
 */
const getSummary = asyncHandler(async (req, res) => {
  const { period = "daily", from, to } = req.query;
  const unit = PERIOD_TO_UNIT[period] || "day";

  const rows = await Trip.aggregate([
    { $match: buildDateMatch(from, to) },
    {
      $group: {
        _id: { $dateTrunc: { date: "$startDate", unit } },
        totalFreight: { $sum: { $ifNull: ["$summary.freightTotal", 0] } },
        totalExpenses: { $sum: { $ifNull: ["$summary.expensesTotal", 0] } },
        netProfitLoss: { $sum: { $ifNull: ["$summary.profitLoss", 0] } },
        tripCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: "$_id",
        totalFreight: 1,
        totalExpenses: 1,
        netProfitLoss: 1,
        tripCount: 1,
      },
    },
  ]);

  res.json({ success: true, period, data: rows });
});

/**
 * @route GET /api/dashboard/trend?period=daily|weekly|monthly|yearly&from=&to=
 * Same shape as summary but intended for chart-friendly time series.
 */
const getTrend = getSummary; // identical aggregation, kept as a separate named route for frontend clarity

/**
 * @route GET /api/dashboard/overview
 * Snapshot for "today" plus running totals - good for a landing dashboard.
 */
const getOverview = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [todayAgg] = await Trip.aggregate([
    { $match: { startDate: { $gte: startOfToday, $lt: startOfTomorrow } } },
    {
      $group: {
        _id: null,
        todayFreight: { $sum: { $ifNull: ["$summary.freightTotal", 0] } },
        todayExpenses: { $sum: { $ifNull: ["$summary.expensesTotal", 0] } },
        todayProfitLoss: { $sum: { $ifNull: ["$summary.profitLoss", 0] } },
        todayTrips: { $sum: 1 },
      },
    },
  ]);

  const [allTimeAgg] = await Trip.aggregate([
    {
      $group: {
        _id: null,
        totalFreight: { $sum: { $ifNull: ["$summary.freightTotal", 0] } },
        totalExpenses: { $sum: { $ifNull: ["$summary.expensesTotal", 0] } },
        totalProfitLoss: { $sum: { $ifNull: ["$summary.profitLoss", 0] } },
        totalTrips: { $sum: 1 },
      },
    },
  ]);

  const maintenanceAgg = await Maintenance.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const maintenanceCounts = { pending: 0, upcoming: 0, ongoing: 0 };
  maintenanceAgg.forEach((r) => {
    if (maintenanceCounts[r._id] !== undefined) maintenanceCounts[r._id] = r.count;
  });

  const paymentAgg = await Payment.aggregate([
    {
      $group: {
        _id: { paymentType: "$paymentType", direction: "$direction" },
        total: { $sum: "$amount" },
      },
    },
  ]);
  const paymentTotals = { cashReceived: 0, cashPaid: 0, onlineReceived: 0, onlinePaid: 0 };
  paymentAgg.forEach((r) => {
    const { paymentType, direction } = r._id;
    if (paymentType === "cash" && direction === "received") paymentTotals.cashReceived = r.total || 0;
    if (paymentType === "cash" && direction === "paid") paymentTotals.cashPaid = r.total || 0;
    if (paymentType === "online" && direction === "received") paymentTotals.onlineReceived = r.total || 0;
    if (paymentType === "online" && direction === "paid") paymentTotals.onlinePaid = r.total || 0;
  });

  const [totalVehicles, activeVehicles, dailyFleet] = await Promise.all([
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: "active" }),
  ]);

  const [totalFleets, reservedFleets, runningFleets, todayFleets] = await Promise.all([
    Fleet.countDocuments(),
    Fleet.countDocuments({ reservationStatus: { $in: ["reserved", "approved"] } }),
    Fleet.countDocuments({ status: "active" }),
    Fleet.countDocuments({
      $or: [
        { createdAt: { $gte: startOfToday, $lt: startOfTomorrow } },
        { updatedAt: { $gte: startOfToday, $lt: startOfTomorrow } },
      ],
    }),
  ]);

  res.json({
    success: true,
    data: {
      today: todayAgg || { todayFreight: 0, todayExpenses: 0, todayProfitLoss: 0, todayTrips: 0 },
      allTime: allTimeAgg || { totalFreight: 0, totalExpenses: 0, totalProfitLoss: 0, totalTrips: 0 },
      maintenanceCounts,
      paymentTotals,
      vehicleCounts: { active: activeVehicles, total: totalVehicles },
      fleetCounts: { total: totalFleets, reserved: reservedFleets, running: runningFleets, today: todayFleets },
    },
  });
});

/**
 * @route GET /api/dashboard/vehicle-performance?from=&to=
 * Per-vehicle freight/expense/profit ranking - useful to spot loss-making vehicles.
 * Starts from Vehicle so vehicles with zero trips still show up with zeros.
 */
const getVehiclePerformance = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const tripMatch = { $expr: { $eq: ["$vehicle", "$$vehicleId"] } };
  if (from || to) {
    tripMatch.startDate = {};
    if (from) tripMatch.startDate.$gte = new Date(from);
    if (to) tripMatch.startDate.$lte = endOfDay(to);
  }

  const rows = await Vehicle.aggregate([
    {
      $lookup: {
        from: "trips",
        let: { vehicleId: "$_id" },
        pipeline: [{ $match: from || to ? tripMatch : { $expr: { $eq: ["$vehicle", "$$vehicleId"] } } }],
        as: "trips",
      },
    },
    {
      $project: {
        vehicleNo: 1,
        tripCount: { $size: "$trips" },
        totalFreight: { $sum: "$trips.summary.freightTotal" },
        totalExpenses: { $sum: "$trips.summary.expensesTotal" },
        netProfitLoss: { $sum: "$trips.summary.profitLoss" },
      },
    },
    { $sort: { netProfitLoss: -1 } },
  ]);

  res.json({ success: true, data: rows });
});

module.exports = { getSummary, getTrend, getOverview, getVehiclePerformance };
