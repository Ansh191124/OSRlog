import InventoryItem from "../models/InventoryItem.js";

export async function listInventory(req, res) {
  const items = await InventoryItem.find().populate("usageLog.recordedBy", "name").sort({ createdAt: -1 });
  res.json({ items });
}

// Manual admin/co-admin override — a direct stock correction, separate from
// the paid-procurement flow (see inventoryPurchaseController). Keeps the
// totalReceived/totalUsed invariant intact by folding any quantity change
// into totalReceived.
export async function createInventoryItem(req, res) {
  const { name, quantity, unit, notes } = req.body;
  if (!name) return res.status(400).json({ message: "name is required" });

  const qty = quantity || 0;
  const item = await InventoryItem.create({
    name,
    quantity: qty,
    totalReceived: qty,
    unit,
    notes,
    updatedBy: req.user._id,
  });
  res.status(201).json({ item });
}

export async function updateInventoryItem(req, res) {
  const { id } = req.params;
  const item = await InventoryItem.findById(id);
  if (!item) return res.status(404).json({ message: "Inventory item not found" });

  const { name, quantity, unit, notes } = req.body;
  if (name !== undefined) item.name = name;
  if (unit !== undefined) item.unit = unit;
  if (notes !== undefined) item.notes = notes;
  if (quantity !== undefined) {
    const delta = quantity - item.quantity;
    item.totalReceived += delta;
    item.quantity = quantity;
  }
  item.updatedBy = req.user._id;

  await item.save();
  res.json({ item });
}

// Entry Master/Co-Admin/Admin: record that some of an item's current stock
// has been used — "how much left and how much used" is then just
// totalReceived/totalUsed/quantity on the item, kept in sync here.
export async function recordUsage(req, res) {
  const { id } = req.params;
  const { quantityUsed, note } = req.body;
  if (!quantityUsed || quantityUsed <= 0) {
    return res.status(400).json({ message: "quantityUsed must be a positive number" });
  }

  const item = await InventoryItem.findById(id);
  if (!item) return res.status(404).json({ message: "Inventory item not found" });
  if (quantityUsed > item.quantity) {
    return res.status(400).json({ message: `Only ${item.quantity} ${item.unit || ""} left in stock`.trim() });
  }

  item.totalUsed += quantityUsed;
  item.quantity -= quantityUsed;
  item.usageLog.push({ quantityUsed, note, recordedBy: req.user._id });
  item.updatedBy = req.user._id;
  await item.save();

  const populated = await InventoryItem.findById(item._id).populate("usageLog.recordedBy", "name");
  res.json({ item: populated });
}
