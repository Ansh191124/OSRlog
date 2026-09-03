const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

/**
 * Mirrors the paper trip sheet layout used across TripDetail.jsx:
 * header -> leg entries -> expense box -> summary box.
 */
const ENTRY_COLUMNS = [
  { key: "date", label: "Date" },
  { key: "partyName", label: "Party" },
  { key: "fromLocation", label: "From" },
  { key: "toLocation", label: "To" },
  { key: "freight", label: "Freight" },
  { key: "odometer", label: "Odometer" },
  { key: "adv", label: "Advance" },
  { key: "diesel", label: "Diesel (L)" },
  { key: "amt", label: "Amount" },
];

const EXPENSE_FIELDS = ["dala", "border", "tollTax", "dieselLitres", "diesel", "salary", "urea", "fooding", "ureaNagad", "kiraya"];

const SUMMARY_FIELDS = [
  "drAdv", "expenseTotal", "total", "gpsKm", "mtrKm", "diffKm",
  "totalDieselLitres", "totalDieselAmount", "costPerKm", "mileage", "expensePercent",
  "freightPerKm", "plPerDay", "days", "tankFullLitres", "tankFullAmount",
  "freightTotal", "expensesTotal", "profitLoss",
];

const prettify = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
const dateStr = (d) => (d ? String(d).slice(0, 10) : "-");
const num = (v) => (v === undefined || v === null || v === "" ? "-" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }));

const driverName = (trip) => trip.driverNameText || trip.driver?.name || "-";
const vehicleNo = (trip) => trip.vehicleNoText || trip.vehicle?.vehicleNo || "-";

function buildTripPdf(trip, res) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).text(`Trip Sheet - ${trip.tripCode || ""}`, { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#444")
    .text(`Vehicle: ${vehicleNo(trip)}    Driver: ${driverName(trip)}`)
    .text(`Start: ${dateStr(trip.startDate)} ${trip.timeIn || ""}    End: ${dateStr(trip.endDate)} ${trip.timeOut || ""}`);
  if (trip.remark) doc.text(`Remark: ${trip.remark}`);
  doc.fillColor("#000");
  doc.moveDown();

  doc.fontSize(12).text("Leg entries", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(8);
  (trip.entries || []).forEach((entry) => {
    const line = ENTRY_COLUMNS.map((c) => `${c.label}: ${c.key === "date" ? dateStr(entry[c.key]) : (entry[c.key] ?? "-")}`).join("   ");
    doc.text(line);
  });
  if (!trip.entries?.length) doc.text("No leg entries recorded.");
  doc.moveDown();

  doc.fontSize(12).text("Expense box", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(9);
  EXPENSE_FIELDS.forEach((k) => doc.text(`${prettify(k)}: ${num(trip.expense?.[k])}`));
  doc.moveDown();

  doc.fontSize(12).text("Summary", { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(9);
  SUMMARY_FIELDS.forEach((k) => doc.text(`${prettify(k)}: ${num(trip.summary?.[k])}`));

  doc.end();
}

async function buildTripExcel(trip, res) {
  const workbook = new ExcelJS.Workbook();

  const header = workbook.addWorksheet("Trip");
  header.addRow(["Trip Sheet", trip.tripCode || ""]);
  header.addRow(["Vehicle", vehicleNo(trip)]);
  header.addRow(["Driver", driverName(trip)]);
  header.addRow(["Start", `${dateStr(trip.startDate)} ${trip.timeIn || ""}`]);
  header.addRow(["End", `${dateStr(trip.endDate)} ${trip.timeOut || ""}`]);
  if (trip.remark) header.addRow(["Remark", trip.remark]);

  const entriesSheet = workbook.addWorksheet("Leg entries");
  entriesSheet.addRow(ENTRY_COLUMNS.map((c) => c.label));
  (trip.entries || []).forEach((entry) => {
    entriesSheet.addRow(ENTRY_COLUMNS.map((c) => (c.key === "date" ? dateStr(entry[c.key]) : entry[c.key] ?? "")));
  });
  entriesSheet.getRow(1).font = { bold: true };

  const expenseSheet = workbook.addWorksheet("Expense box");
  expenseSheet.addRow(["Field", "Value"]);
  EXPENSE_FIELDS.forEach((k) => expenseSheet.addRow([prettify(k), trip.expense?.[k] ?? ""]));
  expenseSheet.getRow(1).font = { bold: true };

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRow(["Field", "Value"]);
  SUMMARY_FIELDS.forEach((k) => summarySheet.addRow([prettify(k), trip.summary?.[k] ?? ""]));
  summarySheet.getRow(1).font = { bold: true };

  await workbook.xlsx.write(res);
}

module.exports = { buildTripPdf, buildTripExcel };
