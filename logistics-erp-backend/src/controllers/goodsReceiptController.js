import GoodsReceipt from "../models/GoodsReceipt.js";
import LorryReceipt from "../models/LorryReceipt.js";
import User from "../models/User.js";
import { nextSequence } from "../models/Counter.js";
import { generateGrPdf } from "../utils/pdf.js";
import { uploadBuffer } from "../utils/s3.js";
import { ROLES } from "../config/roles.js";

const GR_POPULATE = [
  { path: "client", select: "name email companyName gstin" },
  { path: "issuedBy", select: "name" },
  {
    path: "lorryReceipts",
    select: "lrNumber billNumber fromLocation toLocation loadingSlip",
    populate: { path: "loadingSlip", select: "slipNumber freightRate totalAmount" },
  },
];

export async function listGoodsReceipts(req, res) {
  const goodsReceipts = await GoodsReceipt.find().populate(GR_POPULATE).sort({ createdAt: -1 });
  res.json({ goodsReceipts });
}

// Preview which of a client's LRs would be swept into a new GR right now —
// `used` (delivered) and not already included in an earlier GR for them.
export async function previewEligibleLrs(req, res) {
  const { clientId } = req.params;
  const client = await User.findOne({ _id: clientId, role: ROLES.CLIENT });
  if (!client) return res.status(404).json({ message: "Client not found" });

  const lorryReceipts = await LorryReceipt.find({ client: client._id, status: "used", goodsReceipt: null })
    .select("lrNumber billNumber fromLocation toLocation loadingSlip")
    .populate({ path: "loadingSlip", select: "slipNumber freightRate totalAmount" });
  res.json({ client: { _id: client._id, name: client.name, companyName: client.companyName }, lorryReceipts });
}

// GR is client-scoped, not trip-scoped: sweeps up every `used` LR for this
// client not already claimed by an earlier GR. An LR can only ever belong to
// one GR.
export async function generateForClient(req, res) {
  const { clientId } = req.body;
  const client = await User.findOne({ _id: clientId, role: ROLES.CLIENT });
  if (!client) return res.status(404).json({ message: "Client not found" });

  const eligible = await LorryReceipt.find({ client: client._id, status: "used", goodsReceipt: null });
  if (eligible.length === 0) {
    return res.status(400).json({ message: "This client has no delivered LRs awaiting a Goods Receipt" });
  }

  const grNumber = await nextSequence("GR");
  const goodsReceipt = await GoodsReceipt.create({
    grNumber,
    client: client._id,
    lorryReceipts: eligible.map((lr) => lr._id),
    issuedBy: req.user._id,
  });

  await LorryReceipt.updateMany({ _id: { $in: eligible.map((lr) => lr._id) } }, { goodsReceipt: goodsReceipt._id });

  const populated = await GoodsReceipt.findById(goodsReceipt._id).populate(GR_POPULATE);
  res.status(201).json({ goodsReceipt: populated });
}

export async function downloadGoodsReceiptPdf(req, res) {
  const { id } = req.params;
  const goodsReceipt = await GoodsReceipt.findById(id).populate(GR_POPULATE);
  if (!goodsReceipt) return res.status(404).json({ message: "Goods Receipt not found" });

  const buffer = await generateGrPdf(goodsReceipt);
  const key = `gr/${goodsReceipt.grNumber}.pdf`;
  await uploadBuffer(key, buffer, "application/pdf");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="GR-${goodsReceipt.grNumber}.pdf"`);
  res.send(buffer);
}
