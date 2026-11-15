import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsFilters from "../components/analytics/AnalyticsFilters";
import AnalyticsSummary from "../components/analytics/AnalyticsSummary";
import ConsumptionAnalysis from "../components/analytics/ConsumptionAnalysis";
import ExpenseAnalysis from "../components/analytics/ExpenseAnalysis";
import MonthlyComparison from "../components/analytics/MonthlyComparison";
import AnalyticsInsights from "../components/analytics/AnalyticsInsights";
import MonthlyAnalyticsTable from "../components/analytics/MonthlyAnalyticsTable";
import { exportAnalyticsCsv } from "../utils/exportCsv";
import { describePeriod, filterByPeriod, normalizeMonthly, resolveRange, summarize } from "../utils/analytics";
import { getMonthlyAnalytics } from "../services/api";

export default function AnalyticsPage({ onNavigate }) {
  const [months, setMonths] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const [period, setPeriod] = useState("6");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Fetches once on mount (every visit to this page) and again only on Refresh or Try again.
  // Changing a filter never triggers a request.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const records = await getMonthlyAnalytics();
        const result = normalizeMonthly(records);
        if (ignore) return;
        setMonths(result.months);
        setSkipped(result.skipped);
        setError("");
      } catch (err) {
        if (ignore) return;
        setMonths([]);
        setSkipped(0);
        setError(err.message || "Unable to load analytics.");
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadCount((n) => n + 1);
  }, []);

  const range = useMemo(() => resolveRange(months, from, to), [months, from, to]);
  const { rows, error: rangeError } = useMemo(
    () => filterByPeriod(months, { period, from, to }),
    [months, period, from, to]
  );
  const summary = useMemo(() => summarize(rows), [rows]);
  const periodLabel = describePeriod(period, rows);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm text-muted">
        Analytics use one total per billing month, built from all saved bills combined. The database holds no daily or weekly readings, and months without bills are left out rather than shown as zero.
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <span className="flex-1">{error}</span>
          <button onClick={refresh} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">
            Try again
          </button>
        </div>
      )}

      {skipped > 0 && (
        <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200">
          {skipped} {skipped === 1 ? "record" : "records"} from the server {skipped === 1 ? "was" : "were"} ignored because {skipped === 1 ? "it was" : "they were"} incomplete or invalid.
        </div>
      )}

      <AnalyticsFilters
        period={period}
        onPeriod={setPeriod}
        months={months}
        rangeStart={range.start}
        rangeEnd={range.end}
        onRangeStart={setFrom}
        onRangeEnd={setTo}
        rangeError={rangeError}
        periodLabel={periodLabel}
        onExport={() => exportAnalyticsCsv(rows, periodLabel)}
        exportDisabled={rows.length === 0}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      {!error && months.length === 0 && (
        <div className="rounded-xl border border-line bg-surface px-4 py-10 text-center">
          <p className="text-sm font-semibold">No analytics yet</p>
          <p className="mt-1 text-sm text-muted">Analytics appear once electricity bills are saved.</p>
          <button onClick={() => onNavigate?.("bills")} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-base transition hover:brightness-110">
            Go to Electricity Bills
          </button>
        </div>
      )}

      {months.length > 0 && rows.length === 0 && (
        <div className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          No months match this selection. Adjust the period or the custom range above.
        </div>
      )}

      {summary && (
        <>
          <AnalyticsSummary summary={summary} />
          <ConsumptionAnalysis rows={rows} summary={summary} />
          <ExpenseAnalysis rows={rows} summary={summary} />
          <MonthlyComparison rows={rows} />
          <AnalyticsInsights rows={rows} />
          <MonthlyAnalyticsTable rows={rows} summary={summary} />
        </>
      )}
    </div>
  );
}