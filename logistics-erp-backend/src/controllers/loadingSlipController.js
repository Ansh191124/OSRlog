import LoadingSlip from "../models/LoadingSlip.js";
import LorryReceipt from "../models/LorryReceipt.js";
import LedgerEntry from "../models/LedgerEntry.js";
import User from "../models/User.js";
import { nextSequence } from "../models/Counter.js";
import { generateLoadingSlipPdf } from "../utils/pdf.js";
import { uploadBuffer, getFileUrl } from "../utils/s3.js";
import { notifyUser, notifyAccountants, notifyAdmins } from "../utils/notify.js";
import { recordAudit } from "../utils/audit.js";
import { ROLES } from "../config/roles.js";

const LOADING_SLIP_POPULATE = [
  {
    path: "lorryReceipt",
    select: "lrNumber billNumber fromLocation toLocation goodsDescription consignor consignee",
  },
  { path: "client", select: "name email companyName" },
  { path: "createdBy", select: "name" },
  { path: "verifiedBy", select: "name" },
];

export async function listLoadingSlips(req, res) {
  const filter = {};
  if (req.scope === ROLES.CLIENT) {
    filter.client = req.user._id;
  }
  const loadingSlips = await LoadingSlip.find(filter).populate(LOADING_SLIP_POPULATE).sort({ createdAt: -1 });
  const results = await Promise.all(
    loadingSlips.map(async (slip) => {
      const obj = slip.toObject();
      if (slip.paymentProofUrl) {
        obj.paymentProofSignedUrl = await getFileUrl(slip.paymentProofUrl);
      }
      return obj;
    })
  );
  res.json({ loadingSlips: results });
}

export async function getLoadingSlip(req, res) {
  const { id } = req.params;
  const loadingSlip = await LoadingSlip.findById(id).populate(LOADING_SLIP_POPULATE);
  if (!loadingSlip) return res.status(404).json({ message: "Loading Slip not found" });

  if (req.scope === ROLES.CLIENT && String(loadingSlip.client?._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your Loading Slip" });
  }

  const result = loadingSlip.toObject();
  if (loadingSlip.paymentProofUrl) {
    result.paymentProofSignedUrl = await getFileUrl(loadingSlip.paymentProofUrl);
  }
  res.json({ loadingSlip: result });
}

// Co-Admin/Admin: create the commercial/financial terms for an already-approved
// LR. Sends it to the client for review, payment, and approval.
export async function createLoadingSlip(req, res) {
  const { lorryReceiptId, freightRate, otherCharges, advance, paymentMode, paymentMethod } = req.body;
  if (!lorryReceiptId) return res.status(400).json({ message: "lorryReceiptId is required" });

  const lorryReceipt = await LorryReceipt.findById(lorryReceiptId);
  if (!lorryReceipt) return res.status(404).json({ message: "Lorry Receipt not found" });
  if (lorryReceipt.status !== "approved") {
    return res.status(400).json({ message: "Only approved Lorry Receipts can get a Loading Slip" });
  }

  const existing = await LoadingSlip.findOne({ lorryReceipt: lorryReceipt._id });
  if (existing) {
    return res.status(400).json({ message: "This Lorry Receipt already has a Loading Slip" });
  }

  const slipNumber = await nextSequence("LOADING_SLIP");
  const loadingSlip = await LoadingSlip.create({
    slipNumber,
    lorryReceipt: lorryReceipt._id,
    client: lorryReceipt.client || null,
    isTemporary: Boolean(lorryReceipt.isTemporary),
    createdBy: req.user._id,
    freightRate: freightRate || 0,
    otherCharges: otherCharges || 0,
    advance: advance || 0,
    paymentMode: paymentMode === "consignee_pays" ? "consignee_pays" : "consignor_pays",
    paymentMethod: ["cash", "online", "upi", "bank_transfer", "cheque"].includes(paymentMethod)
      ? paymentMethod
      : "cash",
    status: "awaiting_payment",
    logs: [{ status: "awaiting_payment", note: "Loading Slip created", updatedBy: req.user._id }],
  });

  // A temporary/walk-in job has no client to notify — Co-Admin/Admin submits
  // the payment proof themselves (see submitPayment).
  if (lorryReceipt.client) {
    await notifyUser(lorryReceipt.client, {
      title: "Loading Slip ready for review",
      message: `Loading Slip #${slipNumber} for LR #${lorryReceipt.lrNumber} is ready — please review and pay.`,
      type: "loading_slip",
      link: `/client/loading-slips/${loadingSlip._id}`,
    });
  }

  await recordAudit({
    user: req.user,
    action: "loadingSlip.create",
    entityType: "LoadingSlip",
    entityId: loadingSlip._id,
    before: null,
    after: {
      lorryReceipt: lorryReceipt._id,
      freightRate: loadingSlip.freightRate,
      otherCharges: loadingSlip.otherCharges,
      advance: loadingSlip.advance,
      paymentMode: loadingSlip.paymentMode,
      paymentMethod: loadingSlip.paymentMethod,
    },
  });

  const populated = await LoadingSlip.findById(loadingSlip._id).populate(LOADING_SLIP_POPULATE);
  res.status(201).json({ loadingSlip: populated });
}

// Client: after paying outside the system, uploads a screenshot as proof and
// approves — sends it to the Accountant for verification. For a temporary/
// walk-in job (no client), Admin/Co-Admin submits the proof directly instead.
export async function submitPayment(req, res) {
  const { id } = req.params;
  const { proofUrl } = req.body;

  const loadingSlip = await LoadingSlip.findById(id);
  if (!loadingSlip) return res.status(404).json({ message: "Loading Slip not found" });
  // Cash payments aren't proven with a screenshot — only non-cash methods need proof.
  if (loadingSlip.paymentMethod !== "cash" && !proofUrl) {
    return res.status(400).json({ message: "proofUrl is required" });
  }

  const isAdminLike = req.scope === ROLES.ADMIN || req.scope === ROLES.CO_ADMIN;
  if (loadingSlip.isTemporary) {
    if (!isAdminLike) return res.status(403).json({ message: "Not authorized" });
  } else if (String(loadingSlip.client) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your Loading Slip" });
  }
  if (!["awaiting_payment", "payment_rejected"].includes(loadingSlip.status)) {
    return res.status(400).json({ message: "This Loading Slip isn't awaiting payment" });
  }

  loadingSlip.paymentProofUrl = proofUrl || null;
  loadingSlip.clientSubmittedAt = new Date();
  loadingSlip.status = "payment_submitted";
  loadingSlip.rejectionReason = null;
  loadingSlip.logs.push({
    status: "payment_submitted",
    note: loadingSlip.isTemporary
      ? "Payment confirmed by Co-Admin/Admin"
      : proofUrl
        ? "Client submitted payment proof"
        : "Client confirmed cash payment",
    updatedBy: req.user._id,
  });
  await loadingSlip.save();

  await notifyAccountants({
    title: "Payment ready for verification",
    message: `Loading Slip #${loadingSlip.slipNumber} — payment proof submitted, awaiting verification.`,
    type: "loading_slip",
    link: "/accountant/loading-slips",
  });

  const populated = await LoadingSlip.findById(loadingSlip._id).populate(LOADING_SLIP_POPULATE);
  res.json({ loadingSlip: populated });
}

// Accountant: confirms whether the submitted proof reflects a real, received
// payment. Verifying unlocks the LR for vehicle assignment.
export async function verifyPayment(req, res) {
  const { id } = req.params;
  const { decision, rejectionReason } = req.body;
  if (!["verified", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'verified' or 'rejected'" });
  }

  const loadingSlip = await LoadingSlip.findById(id);
  if (!loadingSlip) return res.status(404).json({ message: "Loading Slip not found" });
  if (loadingSlip.status !== "payment_submitted") {
    return res.status(400).json({ message: "Only submitted payments can be verified" });
  }

  const lorryReceipt = await LorryReceipt.findById(loadingSlip.lorryReceipt).select("lrNumber consignor");

  if (decision === "verified") {
    loadingSlip.status = "verified";
    loadingSlip.verifiedBy = req.user._id;
    loadingSlip.verifiedAt = new Date();
    loadingSlip.logs.push({ status: "verified", note: "Payment verified by Accountant", updatedBy: req.user._id });
    await loadingSlip.save();

    await LorryReceipt.findByIdAndUpdate(loadingSlip.lorryReceipt, { loadingSlip: loadingSlip._id });

    // Record the received payment in the verifying Accountant's own book —
    // Cashbook for cash, Cashless Book for every other payment method — so it
    // immediately reflects on their dashboard totals and ledger view. The
    // `advance` is the amount actually paid and proved through this flow;
    // `balance` ("To Pay") is what's still outstanding — not yet received —
    // so only the advance belongs in the ledger as "received".
    const client = loadingSlip.client ? await User.findById(loadingSlip.client).select("name companyName") : null;
    const party =
      client?.companyName ||
      client?.name ||
      (loadingSlip.isTemporary ? `Walk-in — ${lorryReceipt?.consignor?.name || "Temporary"}` : "Client");
    await LedgerEntry.create({
      mode: loadingSlip.paymentMethod === "cash" ? "cash" : "online",
      direction: "received",
      amount: loadingSlip.advance,
      party,
      description: `Loading Slip #${loadingSlip.slipNumber} payment`,
      relatedLoadingSlip: loadingSlip._id,
      recordedBy: req.user._id,
      proofUrl: loadingSlip.paymentProofUrl,
    });

    if (loadingSlip.client) {
      await notifyUser(loadingSlip.client, {
        title: "Payment verified",
        message: `Your payment for Loading Slip #${loadingSlip.slipNumber} has been verified.`,
        type: "loading_slip",
        link: `/client/loading-slips/${loadingSlip._id}`,
      });
    }
    await notifyAdmins({
      title: "Loading Slip payment verified",
      message: `Loading Slip #${loadingSlip.slipNumber} is verified and its LR is now ready for vehicle assignment.`,
      type: "loading_slip",
      link: "/admin/loading-slips",
    });
  } else {
    loadingSlip.status = "payment_rejected";
    loadingSlip.rejectionReason = rejectionReason || "Payment could not be verified";
    loadingSlip.logs.push({ status: "payment_rejected", note: loadingSlip.rejectionReason, updatedBy: req.user._id });
    await loadingSlip.save();

    if (loadingSlip.client) {
      await notifyUser(loadingSlip.client, {
        title: "Payment could not be verified",
        message: `Loading Slip #${loadingSlip.slipNumber}: ${loadingSlip.rejectionReason}. Please resubmit.`,
        type: "loading_slip",
        link: `/client/loading-slips/${loadingSlip._id}`,
      });
    }
  }

  await recordAudit({
    user: req.user,
    action: "loadingSlip.verify",
    entityType: "LoadingSlip",
    entityId: loadingSlip._id,
    before: { status: "payment_submitted" },
    after: { status: loadingSlip.status, rejectionReason: loadingSlip.rejectionReason || null },
  });

  const populated = await LoadingSlip.findById(loadingSlip._id).populate(LOADING_SLIP_POPULATE);
  res.json({ loadingSlip: populated });
}

export async function downloadLoadingSlipPdf(req, res) {
  const { id } = req.params;
  const loadingSlip = await LoadingSlip.findById(id).populate(LOADING_SLIP_POPULATE);
  if (!loadingSlip) return res.status(404).json({ message: "Loading Slip not found" });

  if (req.scope === ROLES.CLIENT && String(loadingSlip.client?._id) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your Loading Slip" });
  }

  const buffer = await generateLoadingSlipPdf(loadingSlip);
  const key = `loading-slips/${loadingSlip.slipNumber}.pdf`;
  await uploadBuffer(key, buffer, "application/pdf");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="LoadingSlip-${loadingSlip.slipNumber}.pdf"`);
  res.send(buffer);
}
