/**
 * These helpers mirror the arithmetic seen on the paper trip sheet
 * (COST PER km, MILEAGE, EXPENSE %, FREIGHT/KM, P/L etc).
 * They are ONLY used by the optional POST /api/trips/:id/calculate endpoint,
 * to help staff auto-fill suggested numbers. Nothing here is forced on save -
 * every field in trip.expense/trip.summary remains manually editable.
 */

const toNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

function sumExpenses(expense = {}) {
  const fields = [
    "dala", "border", "police", "greaseAir", "guide", "parking", "fooding",
    "ureaNagad", "kiraya", "tollTax", "diesel", "salary", "incentive", "urea",
    "labour", "otherExpense",
  ];
  return fields.reduce((sum, key) => sum + toNum(expense[key]), 0);
}

function sumFreight(entries = []) {
  return entries.reduce((sum, e) => sum + toNum(e.freight), 0);
}

function sumField(entries = [], field) {
  return entries.reduce((sum, e) => sum + toNum(e[field]), 0);
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : null;
}

/**
 * Suggests summary values purely from entries + expense + trip dates.
 * Returns a plain object with the same shape as trip.summary fields.
 */
function suggestTripSummary({ trip, entries, expense }) {
  const freightTotal = sumFreight(entries);
  const expensesTotal = sumExpenses(expense);
  const advTotal = sumField(entries, "adv");
  const dieselLitresTotal = sumField(entries, "diesel");
  const dieselAmountTotal = toNum(expense.diesel);

  const drAdv = advTotal;
  const expenseTotal = expensesTotal;
  const total = drAdv - expenseTotal;

  const days = daysBetween(trip.startDate, trip.endDate);

  // GPS/MTR KM must come from odometer manual entries or GPS device - left null,
  // staff fills these two manually then diff/mileage/cost-per-km can be derived.
  const gpsKm = null;
  const mtrKm = null;

  const profitLoss = freightTotal - expensesTotal;

  return {
    drAdv,
    expenseTotal,
    total,
    gpsKm,
    mtrKm,
    diffKm: null,
    totalDieselLitres: dieselLitresTotal || null,
    totalDieselAmount: dieselAmountTotal || null,
    costPerKm: null, // = expensesTotal / km once km is known
    mileage: null, // = km / dieselLitresTotal once km is known
    expensePercent: freightTotal ? Number(((expensesTotal / freightTotal) * 100).toFixed(2)) : null,
    freightPerKm: null, // = freightTotal / km once km is known
    plPerDay: days ? Number((profitLoss / days).toFixed(2)) : null,
    days,
    freightTotal,
    expensesTotal,
    profitLoss,
  };
}

module.exports = {
  sumExpenses,
  sumFreight,
  sumField,
  daysBetween,
  suggestTripSummary,
};
