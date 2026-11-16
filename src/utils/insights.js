import { normalizeMonthly, SHORT_MONTHS, toNonNegativeNumber } from "./analytics";

// Turns the /api/insights/energy response into safe, predictable data for the page.
// Anything missing or malformed falls back to an empty value instead of crashing.

export const CATEGORY_LABELS = {
  information: "Information",
  usage: "Usage",
  expense: "Expense",
  data_availability: "Data availability",
};

const STATUSES = ["info", "notice", "attention"];
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v) => toNonNegativeNumber(v);
const signedNum = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// "2026-10" -> "Oct 2026"
export function monthLabel(id) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])/.exec(String(id ?? ""));
  return match ? `${SHORT_MONTHS[Number(match[2]) - 1]} ${match[1]}` : "Not available";
}

function normalizeBill(raw) {
  if (!isObject(raw) || typeof raw.consumer_reference !== "string") return null;
  const units = num(raw.units);
  const amount = num(raw.amount);
  if (units === null || amount === null) return null;
  return { reference: raw.consumer_reference, month: raw.month, units, amount };
}

function normalizeChange(raw) {
  if (!isObject(raw)) return null;
  const unitsDiff = signedNum(raw.units_diff);
  if (unitsDiff === null) return null;
  return {
    fromMonth: raw.from_month,
    toMonth: raw.to_month,
    unitsDiff,
    unitsPct: signedNum(raw.units_pct),
    expenseDiff: signedNum(raw.expense_diff),
    expensePct: signedNum(raw.expense_pct),
  };
}

function normalizeHousehold(raw) {
  if (!isObject(raw) || typeof raw.consumer_reference !== "string") return null;
  const bills = num(raw.bill_count);
  const units = num(raw.total_units);
  const expense = num(raw.total_expense);
  if (bills === null || units === null || expense === null) return null;
  return {
    reference: raw.consumer_reference,
    bills,
    units,
    expense,
    avgUnits: num(raw.avg_units_per_bill),
    avgExpense: num(raw.avg_expense_per_bill),
    firstMonth: raw.first_month,
    lastMonth: raw.last_month,
    change: normalizeChange(raw.latest_change),
  };
}

function normalizeInsight(raw) {
  if (!isObject(raw) || typeof raw.title !== "string" || typeof raw.message !== "string") return null;
  return {
    id: String(raw.id ?? raw.title),
    category: raw.category in CATEGORY_LABELS ? raw.category : "information",
    status: STATUSES.includes(raw.status) ? raw.status : "info",
    title: raw.title,
    message: raw.message,
  };
}

export function normalizeInsights(data) {
  if (!isObject(data)) throw new Error("The server sent an unexpected response.");

  const overview = isObject(data.overview) ? data.overview : {};
  const patterns = isObject(data.usage_patterns) ? data.usage_patterns : {};
  const quality = isObject(data.data_quality) ? data.data_quality : {};
  const { months, skipped } = normalizeMonthly(data.monthly_analysis ?? []);

  const payment = isObject(patterns.payment_summary) ? patterns.payment_summary : {};
  const paymentRow = (key) => ({
    count: num(payment[key]?.count) ?? 0,
    amount: num(payment[key]?.amount) ?? 0,
  });

  return {
    overview: {
      kwh: num(overview.total_consumption) ?? 0,
      expense: num(overview.total_expense) ?? 0,
      bills: num(overview.total_bills) ?? 0,
      households: num(overview.household_count) ?? 0,
    },
    months,
    skippedMonths: skipped,
    households: (Array.isArray(data.household_analysis) ? data.household_analysis : []).map(normalizeHousehold).filter(Boolean),
    patterns: {
      highestConsumption: normalizeBill(patterns.highest_consumption),
      lowestConsumption: normalizeBill(patterns.lowest_consumption),
      highestBill: normalizeBill(patterns.highest_bill),
      lowestBill: normalizeBill(patterns.lowest_bill),
      avgUnits: num(patterns.avg_units_per_bill),
      avgExpense: num(patterns.avg_expense_per_bill),
      avgCostPerKwh: num(patterns.avg_cost_per_kwh),
      payment: { paid: paymentRow("Paid"), unpaid: paymentRow("Unpaid"), overdue: paymentRow("Overdue") },
      outstandingCount: num(patterns.outstanding_count) ?? 0,
      outstandingAmount: num(patterns.outstanding_amount) ?? 0,
    },
    insights: (Array.isArray(data.insights) ? data.insights : []).map(normalizeInsight).filter(Boolean),
    quality: {
      hasData: quality.has_data === true,
      skippedRecords: num(quality.skipped_records) ?? 0,
      householdTrends: quality.sufficient_for_household_trends === true,
      unusualCheck: quality.sufficient_for_unusual_check === true,
      monthsComparable: quality.monthly_totals_comparable === true,
      message: typeof quality.message === "string" ? quality.message : "",
      unusualCheckMessage: typeof quality.unusual_check_message === "string" ? quality.unusual_check_message : "",
    },
    generatedAt: typeof data.generated_at === "string" ? data.generated_at : "",
  };
}
