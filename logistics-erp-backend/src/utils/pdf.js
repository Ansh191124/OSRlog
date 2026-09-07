import PDFDocument from "pdfkit";
import { TRIP_EXPENSE_CATEGORIES } from "../models/Trip.js";

function bufferFromDoc(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

const INR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const FTL_SIZES = [14, 17, 19, 22, 24, 32, 34];

// A bordered box with a small grey label and a value beneath it — the basic
// building block of the consignment-note / trip-sheet layouts below.
function box(doc, x, y, w, h, label, value) {
  doc.rect(x, y, w, h).stroke("#999");
  if (label) doc.fontSize(6.5).fillColor("#666").text(label, x + 4, y + 3, { width: w - 8 });
  doc.fontSize(9.5).fillColor("#111").text(value ?? "", x + 4, y + (label ? 13 : h / 2 - 5), {
    width: w - 8,
    height: h - 16,
    ellipsis: true,
  });
}

function sectionTitle(doc, text, y) {
  doc.fontSize(9).fillColor("#111").font("Helvetica-Bold").text(text, 50, y);
  doc.font("Helvetica");
}

export async function generateLrPdf(lr) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const pageW = doc.page.width - 72; // usable width inside margins
  const left = 36;

  // Header
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#0b3d91").text("OSR LOGISTICS", left, 36);
  doc.fontSize(8.5).font("Helvetica").fillColor("#333").text("Transport & Logistics Management Services", left, 58);
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#c0392b").text("CONSIGNMENT NOTE", left, 36, { width: pageW, align: "right" });
  doc.fontSize(9).font("Helvetica").fillColor("#111").text(`LR No.: ${lr.lrNumber}`, left, 58, { width: pageW, align: "right" });
  doc.text(`Bill No.: ${lr.billNumber}`, left, 71, { width: pageW, align: "right" });
  doc.text(`Date: ${new Date(lr.createdAt).toLocaleDateString()}`, left, 84, { width: pageW, align: "right" });

  let y = 100;
  doc.moveTo(left, y).lineTo(left + pageW, y).stroke("#999");
  y += 8;

  // Mode / FTL size
  doc.fontSize(9).text("Mode: FTL", left, y);
  let cx = left + 55;
  FTL_SIZES.forEach((size) => {
    const checked = lr.truckSizeFt === size;
    doc.rect(cx, y, 9, 9).stroke();
    if (checked) doc.rect(cx + 1.5, y + 1.5, 6, 6).fill("#111");
    doc.fillColor("#111").fontSize(8).text(String(size), cx + 12, y);
    cx += 32;
  });

  doc.fontSize(9).text(`From: ${lr.fromLocation || "-"}`, left, y + 16);
  doc.text(`To: ${lr.toLocation || "-"}`, left + pageW / 2, y + 16);
  y += 34;

  // Consignor / Consignee
  const halfW = pageW / 2 - 4;
  box(doc, left, y, halfW, 62, "CONSIGNOR", `${lr.consignor?.name || "-"}\n${lr.consignor?.address || ""}\nGSTIN: ${lr.consignor?.gstin || "-"}`);
  box(doc, left + halfW + 8, y, halfW, 62, "CONSIGNEE", `${lr.consignee?.name || "-"}\n${lr.consignee?.address || ""}\nGSTIN: ${lr.consignee?.gstin || "-"}`);
  y += 70;

  box(
    doc,
    left,
    y,
    halfW,
    40,
    "CLIENT (BOOKED BY)",
    lr.client
      ? `${lr.client.name || "-"}${lr.client.companyName ? ` (${lr.client.companyName})` : ""}\nGSTIN: ${lr.client.gstin || "-"}`
      : "Temporary / Walk-in Job"
  );
  box(doc, left + halfW + 8, y, halfW, 40, "GOODS DESCRIPTION", lr.goodsDescription || "-");
  y += 48;

  // Freight and payment terms live on the Loading Slip, created after this LR
  // is approved — reference it here once one exists.
  sectionTitle(doc, "Freight & Payment", y);
  y += 12;
  const loadingSlipNote = lr.loadingSlip
    ? `See Loading Slip #${lr.loadingSlip.slipNumber} (status: ${lr.loadingSlip.status})`
    : "Loading Slip not yet created";
  box(doc, left, y, pageW, 26, null, loadingSlipNote);
  y += 42;

  doc.fontSize(7).fillColor("#666").text(
    "At Owner's Risk. All disputes subject to jurisdiction only. We hereby certify that we have neither availed any credit of duty paid on input or capital goods used for providing taxable services nor have we availed tax benefit under CENVAT credit.",
    left,
    y,
    { width: pageW }
  );
  y += 40;

  doc.fontSize(9).fillColor("#111");
  doc.text("_____________________", left, y);
  doc.text("Sign. of Consignor", left, y + 12);
  doc.text("_____________________", left + pageW / 3, y);
  doc.text("Sign. of Consignee", left + pageW / 3, y + 12);
  doc.text("_____________________", left + (2 * pageW) / 3, y);
  doc.text("Sign. of Driver", left + (2 * pageW) / 3, y + 12);

  return bufferFromDoc(doc);
}

export async function generateTripSheetPdf(trip) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const pageW = doc.page.width - 72;
  const left = 36;

  doc.rect(left, 36, pageW, 22).fill("#f2d900");
  doc.fillColor("#111").fontSize(14).font("Helvetica-Bold").text("TRIP SHEET", left, 41, { width: pageW, align: "center" });
  doc.font("Helvetica");

  let y = 66;
  const headerCols = [
    { label: "VEHICLE NO.", value: trip.vehicle?.registrationNumber || "-" },
    { label: "DRIVER NAME", value: trip.driver?.name || "-" },
    { label: "START DATE", value: trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "-" },
    { label: "END DATE", value: trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "-" },
  ];
  let x = left;
  const hw = pageW / 4;
  headerCols.forEach((c) => {
    box(doc, x, y, hw, 28, c.label, c.value);
    x += hw;
  });
  y += 28;
  box(doc, left, y, pageW / 2, 22, "TIME IN", trip.timeIn || "-");
  box(doc, left + pageW / 2, y, pageW / 2, 22, "TIME OUT", trip.timeOut || "-");
  y += 30;

  // Legs table
  sectionTitle(doc, "Legs", y);
  y += 12;
  const legCols = [
    { key: "date", label: "Date", w: 55 },
    { key: "party", label: "Party Name", w: 90 },
    { key: "from", label: "From", w: 75 },
    { key: "to", label: "To", w: 75 },
    { key: "freight", label: "Freight", w: 60 },
    { key: "odometer", label: "Odometer", w: 60 },
    { key: "adv", label: "Adv", w: pageW - 55 - 90 - 75 - 75 - 60 - 60 },
  ];
  x = left;
  legCols.forEach((c) => {
    doc.rect(x, y, c.w, 16).fillAndStroke("#eee", "#999");
    doc.fillColor("#111").fontSize(7.5).text(c.label, x + 3, y + 4, { width: c.w - 6 });
    x += c.w;
  });
  y += 16;
  (trip.legs || []).forEach((leg) => {
    x = left;
    const rowH = 18;
    const values = {
      date: leg.date ? new Date(leg.date).toLocaleDateString() : "-",
      party: leg.lorryReceipt?.client?.name || "-",
      from: leg.fromLocation || "-",
      to: leg.toLocation || "-",
      freight: String(leg.freight || 0),
      odometer: leg.odometerReading != null ? String(leg.odometerReading) : "-",
      adv: String(leg.advance || 0),
    };
    legCols.forEach((c) => {
      doc.rect(x, y, c.w, rowH).stroke("#ccc");
      doc.fontSize(7.5).fillColor("#111").text(values[c.key], x + 3, y + 4, { width: c.w - 6, ellipsis: true });
      x += c.w;
    });
    y += rowH;
  });
  y += 10;

  // Fixed-category expenses, two columns
  sectionTitle(doc, "Expense", y);
  y += 12;
  const half = Math.ceil(TRIP_EXPENSE_CATEGORIES.length / 2);
  const leftCats = TRIP_EXPENSE_CATEGORIES.slice(0, half);
  const rightCats = TRIP_EXPENSE_CATEGORIES.slice(half);
  const expenseByCategory = {};
  (trip.expenses || []).forEach((e) => {
    expenseByCategory[e.category] = e.amount;
  });
  const rowH = 14;
  const colW = pageW / 2;
  leftCats.forEach((cat, i) => {
    const ry = y + i * rowH;
    doc.fontSize(8).fillColor("#111").text(cat.toUpperCase(), left, ry, { width: colW * 0.6 });
    doc.text(INR(expenseByCategory[cat] || 0), left + colW * 0.6, ry, { width: colW * 0.4, align: "right" });
  });
  rightCats.forEach((cat, i) => {
    const ry = y + i * rowH;
    doc.fontSize(8).fillColor("#111").text(cat.toUpperCase(), left + colW, ry, { width: colW * 0.6 });
    doc.text(INR(expenseByCategory[cat] || 0), left + colW * 1.6, ry, { width: colW * 0.4, align: "right" });
  });
  y += Math.max(leftCats.length, rightCats.length) * rowH + 12;

  // Summary
  const totalExpenses = (trip.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const driverAdvanceTotal = (trip.legs || []).reduce((sum, l) => sum + (l.advance || 0), 0);
  const totalFreight = (trip.legs || []).reduce((sum, l) => sum + (l.freight || 0), 0);
  const days = trip.startDate && trip.endDate ? Math.max(1, Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000)) : 1;
  const profitLoss = totalFreight - totalExpenses;
  const costPerKm = trip.distanceKm > 0 ? (totalExpenses / trip.distanceKm).toFixed(2) : "0";
  const freightPerKm = trip.distanceKm > 0 ? (totalFreight / trip.distanceKm).toFixed(2) : "0";
  const gpsDiff = (trip.gpsKm || 0) - (trip.distanceKm || 0);

  sectionTitle(doc, "Summary", y);
  y += 12;
  const summaryRows = [
    ["Driver Advance", INR(driverAdvanceTotal)],
    ["Total Expenses", INR(totalExpenses)],
    ["GPS KM", String(trip.gpsKm || 0)],
    ["Odometer KM", String(trip.distanceKm || 0)],
    ["Diff (GPS - Odometer)", String(gpsDiff)],
    ["Total Diesel", `${trip.dieselLiters || 0} L (${INR(trip.dieselTotalCost)})`],
    ["Mileage", `${trip.mileage || 0} km/l`],
    ["Cost / KM", INR(costPerKm)],
    ["Freight / KM", INR(freightPerKm)],
    ["Days", String(days)],
    ["Total Freight", INR(totalFreight)],
    ["Profit / Loss", INR(profitLoss)],
  ];
  const sCols = 3;
  const sColW = pageW / sCols;
  const sRowH = 24;
  summaryRows.forEach((row, i) => {
    const cx2 = left + (i % sCols) * sColW;
    const cy = y + Math.floor(i / sCols) * sRowH;
    box(doc, cx2, cy, sColW, sRowH, row[0], row[1]);
  });

  return bufferFromDoc(doc);
}

export async function generateGrPdf(gr) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const pageW = doc.page.width - 72;
  const left = 36;

  doc.fontSize(18).font("Helvetica-Bold").fillColor("#0b3d91").text("OSR LOGISTICS", left, 36);
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#111").text("GOODS RECEIPT", left, 36, { width: pageW, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor("#111");
  doc.text(`GR No.: ${gr.grNumber}`, left, 58, { width: pageW, align: "right" });
  doc.text(`Date: ${new Date(gr.createdAt).toLocaleDateString()}`, left, 71, { width: pageW, align: "right" });

  let y = 90;
  box(doc, left, y, pageW, 34, "CLIENT", `${gr.client?.name || "-"}${gr.client?.companyName ? ` (${gr.client.companyName})` : ""} — GSTIN: ${gr.client?.gstin || "-"}`);
  y += 42;

  sectionTitle(doc, `Included Lorry Receipts (${gr.lorryReceipts?.length || 0})`, y);
  y += 12;

  const cols = [
    { key: "lrNumber", label: "LR No.", w: 60 },
    { key: "billNumber", label: "Bill No.", w: 60 },
    { key: "route", label: "Route", w: 180 },
    { key: "freightRate", label: "Freight", w: 90 },
    { key: "grandTotal", label: "Grand Total", w: pageW - 60 - 60 - 180 - 90 },
  ];
  let x = left;
  cols.forEach((c) => {
    doc.rect(x, y, c.w, 16).fillAndStroke("#eee", "#999");
    doc.fillColor("#111").fontSize(8).text(c.label, x + 3, y + 4, { width: c.w - 6 });
    x += c.w;
  });
  y += 16;

  let totalFreight = 0;
  let totalGrand = 0;
  (gr.lorryReceipts || []).forEach((lr) => {
    x = left;
    const rowH = 18;
    const freightRate = lr.loadingSlip?.freightRate || 0;
    const grandTotal = lr.loadingSlip?.totalAmount || 0;
    const values = {
      lrNumber: String(lr.lrNumber),
      billNumber: String(lr.billNumber),
      route: `${lr.fromLocation || "-"} -> ${lr.toLocation || "-"}`,
      freightRate: INR(freightRate),
      grandTotal: INR(grandTotal),
    };
    totalFreight += freightRate;
    totalGrand += grandTotal;
    cols.forEach((c) => {
      doc.rect(x, y, c.w, rowH).stroke("#ccc");
      doc.fontSize(8).fillColor("#111").text(values[c.key], x + 3, y + 4, { width: c.w - 6, ellipsis: true });
      x += c.w;
    });
    y += rowH;
  });

  y += 10;
  box(doc, left, y, pageW / 2, 28, "Total Freight", INR(totalFreight));
  box(doc, left + pageW / 2, y, pageW / 2, 28, "Total Grand Total", INR(totalGrand));
  y += 40;

  doc.fontSize(9).fillColor("#111").text(`Issued by: ${gr.issuedBy?.name || "-"}`, left, y);

  return bufferFromDoc(doc);
}

const PAYMENT_MODE_LABELS = { consignor_pays: "Consignor Pays", consignee_pays: "Consignee Pays" };
const PAYMENT_METHOD_LABELS = { cash: "Cash", online: "Online", upi: "UPI", bank_transfer: "Bank Transfer", cheque: "Cheque" };
const LOADING_SLIP_STATUS_LABELS = {
  awaiting_payment: "Awaiting Payment",
  payment_submitted: "Payment Submitted",
  verified: "Verified",
  payment_rejected: "Payment Rejected",
};

export async function generateLoadingSlipPdf(slip) {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const pageW = doc.page.width - 72;
  const left = 36;
  const lr = slip.lorryReceipt || {};

  doc.rect(left, 36, pageW, 22).fill("#f2d900");
  doc.fillColor("#111").fontSize(14).font("Helvetica-Bold").text("LOADING SLIP", left, 41, { width: pageW, align: "center" });
  doc.font("Helvetica");

  let y = 66;
  doc.fontSize(9).fillColor("#111");
  doc.text(`Slip No.: ${slip.slipNumber}`, left, y, { width: pageW, align: "right" });
  doc.text(`Date: ${new Date(slip.createdAt).toLocaleDateString()}`, left, y + 13, { width: pageW, align: "right" });
  y += 32;

  box(doc, left, y, pageW, 32, "ROUTE", `LR #${lr.lrNumber || "-"} — ${lr.fromLocation || "-"} -> ${lr.toLocation || "-"}`);
  y += 40;

  const halfW = pageW / 2 - 4;
  box(doc, left, y, halfW, 40, "CONSIGNOR", `${lr.consignor?.name || "-"}\n${lr.consignor?.address || ""}`);
  box(doc, left + halfW + 8, y, halfW, 40, "CONSIGNEE", `${lr.consignee?.name || "-"}\n${lr.consignee?.address || ""}`);
  y += 48;

  sectionTitle(doc, "Freight & Payment", y);
  y += 12;
  const cols = [
    { label: "Freight", w: pageW / 4, value: INR(slip.freightRate) },
    { label: "Other Charges", w: pageW / 4, value: INR(slip.otherCharges) },
    { label: "Advance", w: pageW / 4, value: INR(slip.advance) },
    { label: "Balance (To Pay)", w: pageW / 4, value: INR(slip.balance) },
  ];
  let x = left;
  cols.forEach((c) => {
    box(doc, x, y, c.w, 30, c.label, c.value);
    x += c.w;
  });
  y += 38;

  box(doc, left, y, pageW / 3 - 4, 28, "Payment Mode", PAYMENT_MODE_LABELS[slip.paymentMode] || "-");
  box(doc, left + pageW / 3 + 2, y, pageW / 3 - 4, 28, "Payment Method", PAYMENT_METHOD_LABELS[slip.paymentMethod] || "-");
  box(doc, left + (2 * pageW) / 3 + 6, y, pageW / 3 - 4, 28, "Status", LOADING_SLIP_STATUS_LABELS[slip.status] || "-");
  y += 48;

  doc.fontSize(9).fillColor("#111");
  doc.text("_____________________", left, y);
  doc.text("Sign. of Client", left, y + 12);
  doc.text("_____________________", left + (2 * pageW) / 3, y);
  doc.text("Sign. of Co-Admin", left + (2 * pageW) / 3, y + 12);

  return bufferFromDoc(doc);
}
