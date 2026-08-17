const asyncHandler = require("express-async-handler");
const { Trip } = require("../models");
const { suggestTripSummary } = require("../utils/calculations");
const { getPagination, paginationMeta, endOfDay } = require("../utils/api");

const populateTrip = (query) =>
  query
    .populate("vehicle", "vehicleNo vehicleType")
    .populate("driver", "name phone");

// Auto-generate a human friendly trip code TRIP-000001
const generateTripCode = async () => {
  const count = await Trip.countDocuments();
  return `TRIP-${String(count + 1).padStart(6, "0")}`;
};

// @route GET /api/trips
// Supports filters: vehicleId, driverId, status, from, to (start date range), search
const getTrips = asyncHandler(async (req, res) => {
  const { vehicleId, driverId, status, from, to, search } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const where = {};

  if (vehicleId) where.vehicle = vehicleId;
  if (driverId) where.driver = driverId;
  if (status) where.status = status;
  if (from || to) {
    where.startDate = {};
    if (from) where.startDate.$gte = new Date(from);
    if (to) where.startDate.$lte = endOfDay(to);
  }
  if (search) {
    where.$or = [
      { tripCode: { $regex: search, $options: "i" } },
      { vehicleNoText: { $regex: search, $options: "i" } },
      { driverNameText: { $regex: search, $options: "i" } },
    ];
  }

  const [rows, count] = await Promise.all([
    populateTrip(Trip.find(where))
      .sort({ startDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Trip.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

// @route GET /api/trips/:id
const getTrip = asyncHandler(async (req, res) => {
  const trip = await populateTrip(Trip.findById(req.params.id));
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  res.json({ success: true, data: trip });
});

// @route POST /api/trips
// Body: { ...trip fields, entries: [...], expense: {...}, summary: {...} }
// Every nested field is optional - staff fills only what they have, exactly like the paper sheet.
const createTrip = asyncHandler(async (req, res) => {
  const { entries = [], expense = {}, summary = {}, vehicleId, driverId, ...tripFields } = req.body;

  const tripCode = tripFields.tripCode || (await generateTripCode());

  const trip = await Trip.create({
    ...tripFields,
    tripCode,
    vehicle: vehicleId || tripFields.vehicle || undefined,
    driver: driverId || tripFields.driver || undefined,
    entries,
    expense,
    summary,
    createdBy: req.user._id,
  });

  const populated = await populateTrip(Trip.findById(trip._id));
  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/trips/:id
// Accepts the same full-form payload as create. Dedicated nested endpoints remain useful
// for autosave workflows, but are no longer required by a frontend edit form.
const updateTrip = asyncHandler(async (req, res) => {
  const { entries, expense, summary, vehicleId, driverId, ...tripFields } = req.body;
  const update = {
    ...tripFields,
    ...(vehicleId !== undefined ? { vehicle: vehicleId || null } : {}),
    ...(driverId !== undefined ? { driver: driverId || null } : {}),
    ...(entries !== undefined ? { entries } : {}),
    ...(expense !== undefined ? { expense } : {}),
    ...(summary !== undefined ? { summary } : {}),
    updatedBy: req.user._id,
  };
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const populated = await populateTrip(Trip.findById(trip._id));
  res.json({ success: true, data: populated });
});

// @route DELETE /api/trips/:id
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  res.json({ success: true, message: "Trip deleted" });
});

// ---------------- Trip Entries (rows, embedded array) ----------------

const addTripEntry = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.entries.push(req.body);
  await trip.save();
  res.status(201).json({ success: true, data: trip.entries[trip.entries.length - 1] });
});

const updateTripEntry = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const entry = trip.entries.id(req.params.entryId);
  if (!entry) {
    res.status(404);
    throw new Error("Trip entry not found");
  }
  entry.set(req.body);
  await trip.save();
  res.json({ success: true, data: entry });
});

const deleteTripEntry = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const entry = trip.entries.id(req.params.entryId);
  if (!entry) {
    res.status(404);
    throw new Error("Trip entry not found");
  }
  entry.deleteOne();
  await trip.save();
  res.json({ success: true, message: "Trip entry deleted" });
});

// ---------------- Trip Expense (embedded object, upsert) ----------------

const upsertTripExpense = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.expense = { ...(trip.expense ? trip.expense.toObject() : {}), ...req.body };
  await trip.save();
  res.json({ success: true, data: trip.expense });
});

// ---------------- Trip Summary (embedded object, upsert) ----------------

const upsertTripSummary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.summary = { ...(trip.summary ? trip.summary.toObject() : {}), ...req.body };
  await trip.save();
  res.json({ success: true, data: trip.summary });
});

// @route POST /api/trips/:id/calculate
// Returns SUGGESTED summary values based on current entries/expense - does NOT save.
// Frontend can show these as pre-filled placeholders, but staff can override anything.
const calculateTripSummary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const suggestion = suggestTripSummary({
    trip,
    entries: trip.entries.map((e) => e.toObject()),
    expense: trip.expense ? trip.expense.toObject() : {},
  });
  res.json({ success: true, data: suggestion });
});

module.exports = {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  addTripEntry,
  updateTripEntry,
  deleteTripEntry,
  upsertTripExpense,
  upsertTripSummary,
  calculateTripSummary,
};
