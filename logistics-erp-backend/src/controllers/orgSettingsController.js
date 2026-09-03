const asyncHandler = require("express-async-handler");
const { OrgSettings } = require("../models");

const getDieselRate = asyncHandler(async (req, res) => {
  const settings = await OrgSettings.getSingleton();
  res.json({ success: true, data: { dieselRate: settings.dieselRate || 0 } });
});

const updateDieselRate = asyncHandler(async (req, res) => {
  const { dieselRate } = req.body;
  if (dieselRate === undefined || Number(dieselRate) < 0) {
    res.status(400); throw new Error("A valid, non-negative diesel rate is required");
  }
  const settings = await OrgSettings.getSingleton();
  settings.dieselRate = Number(dieselRate);
  await settings.save();
  res.json({ success: true, data: { dieselRate: settings.dieselRate } });
});

module.exports = { getDieselRate, updateDieselRate };
