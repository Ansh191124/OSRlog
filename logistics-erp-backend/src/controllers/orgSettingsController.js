const asyncHandler = require("express-async-handler");
const { OrgSettings, Fleet } = require("../models");

const parsePrefix = (code, prefix) => {
  if (!code) return null;
  const match = String(code).trim().match(/^([A-Za-z]*)(\d+)$/);
  if (!match) return null;
  if (match[1].toUpperCase() !== prefix.toUpperCase()) return null;
  return Number(match[2]);
};

const getSettings = asyncHandler(async (req, res) => {
  const settings = await OrgSettings.getSingleton();
  const totalSlots = settings.fleetRangeEnd - settings.fleetRangeStart + 1;

  const reserved = await Fleet.find({
    reservationStatus: { $in: ["reserved", "approved"] },
    fleetCodeFrom: { $exists: true, $ne: null, $ne: "" },
    fleetCodeTo: { $exists: true, $ne: null, $ne: "" },
  });
  const taken = new Set();
  reserved.forEach((f) => {
    const from = parsePrefix(f.fleetCodeFrom, settings.fleetPrefix);
    const to = parsePrefix(f.fleetCodeTo, settings.fleetPrefix);
    if (from === null || to === null) return;
    for (let n = from; n <= to; n++) taken.add(n);
  });

  res.json({
    success: true,
    data: {
      fleetPrefix: settings.fleetPrefix,
      fleetRangeStart: settings.fleetRangeStart,
      fleetRangeEnd: settings.fleetRangeEnd,
      totalSlots,
      reservedSlots: taken.size,
      remainingSlots: totalSlots - taken.size,
    },
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { fleetPrefix, fleetRangeStart, fleetRangeEnd } = req.body;
  if (fleetRangeStart !== undefined && fleetRangeEnd !== undefined && Number(fleetRangeEnd) < Number(fleetRangeStart)) {
    res.status(400); throw new Error("Range end must be on or after range start");
  }
  const settings = await OrgSettings.getSingleton();
  if (fleetPrefix) settings.fleetPrefix = fleetPrefix.trim();
  if (fleetRangeStart !== undefined) settings.fleetRangeStart = Number(fleetRangeStart);
  if (fleetRangeEnd !== undefined) settings.fleetRangeEnd = Number(fleetRangeEnd);
  await settings.save();
  res.json({ success: true, data: settings });
});

module.exports = { getSettings, updateSettings };
