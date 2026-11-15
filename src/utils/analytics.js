import { fmtKwh, fmtPKR } from "./format";

// Data granularity: the database stores one aggregated row per billing month.
// There is no daily or weekly history, so nothing here pretends otherwise.

export const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The API sends months as exactly YYYY-MM.
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

// A month is called "unusually high" when it is more than 25% above the period average.
// This is a simple fixed threshold, not a statistical or machine-learning test.
export const UNUSUAL_THRESHOLD = 0.25;

// Finite number >= 0, or a plain non-negative decimal string such as "8500.00".
// Rejects null, undefined, empty strings, booleans, negatives, Infinity and text.
export function toNonNegativeNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function toNonNegativeInteger(value) {
  const number = toNonNegativeNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

// Converts the API's analytics array into clean, chronologically sorted month records.
// Invalid records are skipped and counted. Duplicate months (not expected, because the
// API groups by month) are merged by summing, which matches how the API aggregates.
export function normalizeMonthly(records) {
  if (!Array.isArray(records)) {
    throw new Error("The server sent an unexpected response.");
  }

  const byId = new Map();
  let skipped = 0;

  for (const record of records) {
    const match = typeof record?.month === "string" ? MONTH_PATTERN.exec(record.month) : null;
    const kwh = toNonNegativeNumber(record?.total_units);
    const expense = toNonNegativeNumber(record?.total_expense);
    const bills = toNonNegativeInteger(record?.total_bills);

    if (!match || kwh === null || expense === null || bills === null) {
      skipped += 1;
      continue;
    }

    const id = `${match[1]}-${match[2]}`;
    const existing = byId.get(id);
    if (existing) {
      existing.kwh += kwh;
      existing.expense += expense;
      existing.bills += bills;
      continue;
    }

    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    const short = SHORT_MONTHS[monthNumber - 1];
    byId.set(id, {
      id,
      label: `${short} ${year}`,
      short,
      kwh,
      expense,
      bills,
      // Day 0 of the next month is the last day of this month.
      days: new Date(year, monthNumber, 0).getDate(),
    });
  }

  const months = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { months, skipped };
}

// Works out the effective custom range. Unknown or empty ids fall back to the
// first and last available months.
export function resolveRange(months, from, to) {
  if (months.length === 0) return { start: "", end: "" };
  const first = months[0].id;
  const last = months[months.length - 1].id;
  return {
    start: months.some((m) => m.id === from) ? from : first,
    end: months.some((m) => m.id === to) ? to : last,
  };
}

// "3", "6", "12" mean the last N months that have records (never padded with empty months).
// "all" is every recorded month. "custom" is an inclusive range of recorded months.
export function filterByPeriod(months, { period, from, to }) {
  if (period === "all") return { rows: months, error: "" };

  if (period === "custom") {
    const { start, end } = resolveRange(months, from, to);
    if (!start || !end) return { rows: [], error: "" };
    if (start > end) return { rows: [], error: "The start month must not be after the end month." };
    return { rows: months.filter((m) => m.id >= start && m.id <= end), error: "" };
  }

  const count = Number(period);
  if (!Number.isInteger(count) || count <= 0) {
    return { rows: [], error: "Choose a valid period." };
  }
  return { rows: months.slice(-count), error: "" };
}

export function describePeriod(period, rows) {
  const span =
    rows.length === 0
      ? "no months"
      : rows.length === 1
        ? rows[0].label
        : `${rows[0].label} – ${rows[rows.length - 1].label}`;

  if (period === "all") return `All available months (${span})`;
  if (period === "custom") return `Custom range (${span})`;
  const count = Number(period);
  if (rows.length > 0 && rows.length < count) {
    return `Last ${count} available months (only ${rows.length} recorded: ${span})`;
  }
  return `Last ${count} available months (${span})`;
}

// Totals and averages across the selected months. Months without bills are never counted.
// When two months tie for highest or lowest, the earlier month is reported.
export function summarize(rows) {
  if (!rows.length) return null;

  let totalKwh = 0;
  let totalExpense = 0;
  let totalBills = 0;
  let totalDays = 0;
  let highestKwh = rows[0];
  let lowestKwh = rows[0];
  let highestExpense = rows[0];
  let lowestExpense = rows[0];

  for (const row of rows) {
    totalKwh += row.kwh;
    totalExpense += row.expense;
    totalBills += row.bills;
    totalDays += row.days;
    if (row.kwh > highestKwh.kwh) highestKwh = row;
    if (row.kwh < lowestKwh.kwh) lowestKwh = row;
    if (row.expense > highestExpense.expense) highestExpense = row;
    if (row.expense < lowestExpense.expense) lowestExpense = row;
  }

  return {
    monthCount: rows.length,
    totalKwh,
    totalExpense,
    totalBills,
    totalDays,
    avgKwh: totalKwh / rows.length,
    avgExpense: totalExpense / rows.length,
    // Total kWh divided by the calendar days of the months shown. Not a meter reading.
    dailyKwh: totalKwh / totalDays,
    highestKwh,
    lowestKwh,
    highestExpense,
    lowestExpense,
  };
}

// ((value - baseline) / baseline) * 100. Returns null when it cannot be calculated.
export function percentChange(baseline, value) {
  if (!Number.isFinite(baseline) || !Number.isFinite(value) || baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}

// Compares month B against month A. Differences are B minus A; percentages are relative to A.
export function compareMonths(a, b) {
  return {
    kwhDiff: b.kwh - a.kwh,
    kwhPct: percentChange(a.kwh, b.kwh),
    expenseDiff: b.expense - a.expense,
    expensePct: percentChange(a.expense, b.expense),
  };
}

const roundTo2 = (n) => Math.round(n * 100) / 100;

export function directionOf(diff) {
  const rounded = roundTo2(diff);
  return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}

export function formatPercent(pct) {
  if (pct === null || !Number.isFinite(pct)) return "Not available";
  if (Math.abs(pct) < 0.05) return "0.0%";
  return `${pct > 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)}%`;
}

export function formatSigned(diff, formatter) {
  const direction = directionOf(diff);
  if (direction === "flat") return formatter(0);
  return `${direction === "up" ? "+" : "-"}${formatter(Math.abs(diff))}`;
}

export function sortRows(rows, order) {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return order === "desc" ? sorted.reverse() : sorted;
}

// Short axis labels: 1,250 -> "1.3k".
export function compactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1000000) return `${Number((n / 1000000).toFixed(1))}M`;
  if (Math.abs(n) >= 1000) return `${Number((n / 1000).toFixed(1))}k`;
  return String(Number(n.toFixed(1)));
}

function describeChange(name, format, key, prev, last) {
  const diff = last[key] - prev[key];
  const base = `${name} in ${last.label}`;
  if (directionOf(diff) === "flat") {
    return `${base} was unchanged from ${prev.label}, the previous recorded month.`;
  }
  const pct = percentChange(prev[key], last[key]);
  const pctText = pct === null ? "" : ` (${Math.abs(pct).toFixed(1)}%)`;
  const word = diff > 0 ? "higher" : "lower";
  return `${base} was ${format(Math.abs(diff))}${pctText} ${word} than in ${prev.label}, the previous recorded month.`;
}

// Rule-based observations from recorded bills only. No forecasts, no savings estimates.
export function buildInsights(rows) {
  const insights = [];
  const count = rows.length;
  if (count === 0) return insights;

  if (count === 1) {
    insights.push({
      id: "single",
      text: `Only one month (${rows[0].label}) is recorded in this period, so trends and comparisons are not available yet.`,
    });
    return insights;
  }

  const prev = rows[count - 2];
  const last = rows[count - 1];
  insights.push({ id: "kwh-change", text: describeChange("Consumption", fmtKwh, "kwh", prev, last) });
  insights.push({ id: "expense-change", text: describeChange("Electricity expense", fmtPKR, "expense", prev, last) });

  const summary = summarize(rows);
  if (summary.highestExpense.expense !== summary.lowestExpense.expense) {
    insights.push({
      id: "expense-high",
      text: `Highest recorded expense: ${summary.highestExpense.label} at ${fmtPKR(summary.highestExpense.expense)}.`,
    });
    insights.push({
      id: "expense-low",
      text: `Lowest recorded expense: ${summary.lowestExpense.label} at ${fmtPKR(summary.lowestExpense.expense)}.`,
    });
  }

  if (count >= 3) {
    const limit = summary.avgKwh * (1 + UNUSUAL_THRESHOLD);
    const high = rows.filter((r) => r.kwh > limit);
    if (high.length > 0) {
      insights.push({
        id: "above-average",
        text: `${high.map((r) => `${r.label} (${fmtKwh(r.kwh)})`).join(", ")} ${high.length === 1 ? "was" : "were"} more than ${UNUSUAL_THRESHOLD * 100}% above this period's average of ${fmtKwh(summary.avgKwh)}.`,
      });
    }
  } else {
    insights.push({
      id: "few-months",
      text: `Only ${count} months of records are available, so insights are limited to simple comparisons.`,
    });
  }

  return insights;
}