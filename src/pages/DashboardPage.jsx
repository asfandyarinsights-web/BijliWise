import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, Zap } from "lucide-react";
import KpiCard from "../components/ui/KpiCard";
import EfficiencyCard from "../components/ui/EfficiencyCard";
import ConsumptionChart from "../components/charts/ConsumptionChart";
import ExpenseChart from "../components/charts/ExpenseChart";
import InsightsPanel from "../components/dashboard/InsightsPanel";
import RecentBills from "../components/dashboard/RecentBills";
import FilterBar from "../components/dashboard/FilterBar";
import { exportCsv } from "../utils/exportCsv";
import { pctChange } from "../utils/format";
import { filterBills, mapBill } from "./BillsPage";
import { getBills, getMonthlyAnalytics } from "../services/api";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Analytics API months are expected as exactly YYYY-MM.
const ANALYTICS_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

// Bill billing_month values are expected as YYYY-MM-DD (BillsPage formats them the same way).
const BILL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Accepts a finite number >= 0, or a plain non-negative decimal string such as "8500.00".
// Rejects null, undefined, empty strings, booleans, negatives, Infinity and anything non-numeric.
function toNonNegativeNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

// True only for a real calendar date in YYYY-MM-DD form (rejects 2026-02-31, 2026-13-01, 2026-00-10).
function isRealCalendarDate(text) {
  const match = BILL_DATE_PATTERN.exec(text);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Turns one API analytics record into the shape the charts expect.
// Returns null for invalid records so they can be dropped safely.
function mapAnalyticsRecord(record) {
  if (record === null || typeof record !== "object") return null;
  if (typeof record.month !== "string") return null;

  const match = ANALYTICS_MONTH_PATTERN.exec(record.month);
  if (!match) return null;

  const kwh = toNonNegativeNumber(record.total_units);
  const bill = toNonNegativeNumber(record.total_expense);
  if (kwh === null || bill === null) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const short = SHORT_MONTHS[monthNumber - 1];

  return {
    id: `${year}-${String(monthNumber).padStart(2, "0")}`,
    label: `${short} ${year}`,
    short,
    kwh,
    bill,
    // Day 0 of the next month is the last day of this month.
    days: new Date(year, monthNumber, 0).getDate(),
  };
}

function mapAnalytics(records) {
  if (!Array.isArray(records)) return [];
  return records
    .map(mapAnalyticsRecord)
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// A bill is usable only if it is an object with a real calendar date and valid numbers,
// so mapBill never turns missing values into fake zeros.
function isUsableBill(bill) {
  return (
    bill !== null &&
    typeof bill === "object" &&
    typeof bill.billing_month === "string" &&
    isRealCalendarDate(bill.billing_month) &&
    toNonNegativeNumber(bill.units_consumed) !== null &&
    toNonNegativeNumber(bill.total_amount) !== null
  );
}

// Newest first, using the raw billing_month, then id as a tie-breaker.
// Malformed records are skipped, and a record that still fails to map is dropped.
function latestBills(rawBills, limit) {
  if (!Array.isArray(rawBills)) return [];
  return rawBills
    .filter(isUsableBill)
    .sort((a, b) => {
      const byMonth = b.billing_month.localeCompare(a.billing_month);
      return byMonth !== 0 ? byMonth : (Number(b.id) || 0) - (Number(a.id) || 0);
    })
    .slice(0, limit)
    .flatMap((bill) => {
      try {
        return [mapBill(bill)];
      } catch {
        return [];
      }
    });
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">
        Try again
      </button>
    </div>
  );
}

export default function DashboardPage({ search = "", onNavigate, refreshKey = 0 }) {
  const [analytics, setAnalytics] = useState([]);
  const [rawBills, setRawBills] = useState([]);
  const [analyticsError, setAnalyticsError] = useState("");
  const [billsError, setBillsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  const [range, setRange] = useState(6);
  const [selectedMonthId, setSelectedMonthId] = useState(null);

  const retry = useCallback(() => {
    setReloadCount((n) => n + 1);
  }, []);

  // Runs once on mount (every visit to the dashboard), on retry, and when refreshKey changes.
  // Filters never trigger a request.
  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);

      const [analyticsResult, billsResult] = await Promise.allSettled([
        getMonthlyAnalytics(),
        getBills(),
      ]);
      if (ignore) return;

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(mapAnalytics(analyticsResult.value));
        setAnalyticsError("");
      } else {
        setAnalytics([]);
        setAnalyticsError(analyticsResult.reason?.message || "Unable to load monthly analytics.");
      }

      if (billsResult.status === "fulfilled") {
        setRawBills(Array.isArray(billsResult.value) ? billsResult.value : []);
        setBillsError("");
      } else {
        setRawBills([]);
        setBillsError(billsResult.reason?.message || "Unable to load electricity bills.");
      }

      setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reloadCount, refreshKey]);

  // Only the months that really exist, never padded to fill the range.
  const chartData = useMemo(() => analytics.slice(-range), [analytics, range]);

  // Falls back to the latest month if nothing is selected or the selection disappeared.
  const selectedIndex = useMemo(() => {
    const found = analytics.findIndex((m) => m.id === selectedMonthId);
    return found >= 0 ? found : analytics.length - 1;
  }, [analytics, selectedMonthId]);

  const cur = selectedIndex >= 0 ? analytics[selectedIndex] : null;
  const prev = selectedIndex > 0 ? analytics[selectedIndex - 1] : null;

  // Search runs across all saved bills first; only then do we keep the top five.
  const bills = useMemo(
    () => filterBills(latestBills(rawBills, rawBills.length), search).slice(0, 5),
    [rawBills, search]
  );

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading dashboard...</p>;
  }

  const daily = cur ? cur.kwh / cur.days : null;
  const prevDaily = prev ? prev.kwh / prev.days : null;
  const hintVs = prev ? `${cur.label} vs ${prev.label}` : cur ? `${cur.label}, no earlier month to compare` : "No data yet";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm text-muted">
        Figures are calculated from all saved bills combined, grouped by month. Efficiency is not scored because no validated household benchmark is available.
      </div>

      {analyticsError && <ErrorBanner message={analyticsError} onRetry={retry} />}

      <FilterBar
        range={range}
        onRange={setRange}
        months={analytics}
        monthIndex={selectedIndex}
        onMonth={(i) => setSelectedMonthId(analytics[i]?.id ?? null)}
        onExport={() => exportCsv(chartData)}
        disabled={analytics.length === 0}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Zap}
          label="Monthly consumption"
          value={cur ? cur.kwh.toLocaleString() : "—"}
          unit="kWh"
          change={cur && prev ? pctChange(cur.kwh, prev.kwh) : undefined}
          hint={hintVs}
        />
        <KpiCard
          icon={Banknote}
          label="Monthly electricity bill"
          value={cur ? cur.bill.toLocaleString("en-PK") : "—"}
          unit="PKR"
          change={cur && prev ? pctChange(cur.bill, prev.bill) : undefined}
          hint={hintVs}
        />
        <KpiCard
          icon={CalendarDays}
          label="Average daily use"
          value={daily !== null ? daily.toFixed(1) : "—"}
          unit="kWh/day"
          change={daily !== null && prevDaily ? pctChange(daily, prevDaily) : undefined}
          hint={cur ? `Units ÷ ${cur.days} calendar days in ${cur.short}` : "No data yet"}
        />
        <EfficiencyCard available={false} hint="Needs a validated household benchmark" />
      </div>

      {analytics.length === 0 && !analyticsError && (
        <div className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
          No monthly data yet. Add a bill on the Bills page and it will appear here.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ConsumptionChart data={chartData} />
        <ExpenseChart data={chartData} />
      </div>

      {billsError && <ErrorBanner message={billsError} onRetry={retry} />}

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightsPanel data={chartData} />
        <RecentBills
          bills={bills}
          emptyMessage={
            billsError
              ? "Bills could not be loaded."
              : rawBills.length === 0
                ? "No bills saved yet."
                : "No bills match your search. Try a month, a consumer reference or a status."
          }
          action={
            <button onClick={() => onNavigate?.("bills")} className="rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-brand/10">
              View all
            </button>
          }
        />
      </div>
    </div>
  );
}