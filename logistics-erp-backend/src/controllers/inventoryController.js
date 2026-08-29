const asyncHandler = require("express-async-handler");
const { InventoryItem, ApprovalRequest } = require("../models");

const getInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find().sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

// Stock follows the required workflow: request -> admin approval -> accountant payment -> available stock.
const addInventory = asyncHandler(async (req, res) => {
  const { name, category = "custom", unit = "pcs", quantity, unitCost, supplier, notes, paymentType = "cash", paymentMode = "cash", date } = req.body;
  if (!name || Number(quantity) <= 0 || Number(unitCost) < 0) {
    res.status(400); throw new Error("name, a positive quantity, and unit cost are required");
  }
  const item = await InventoryItem.create({ name, category, unit, quantity: Number(quantity), unitCost: Number(unitCost), supplier, notes, status: "pending_approval", createdBy: req.user._id });
  const request = await ApprovalRequest.create({
    requestType: "inventory_purchase", title: `Inventory purchase: ${item.name} (${quantity} ${unit})`,
    amount: Number(quantity) * Number(unitCost), paymentType, paymentMode, inventoryItem: item._id,
    details: supplier ? `Supplier: ${supplier}${date ? `; requested date: ${date}` : ""}` : undefined, requestedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: item, request });
});

module.exports = { getInventory, addInventory };
