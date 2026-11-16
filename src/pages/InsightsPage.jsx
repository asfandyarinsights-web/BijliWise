import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Receipt, RefreshCw, Users, Zap } from "lucide-react";
import Card from "../components/ui/Card";
import KpiCard from "../components/ui/KpiCard";
import InsightsCharts from "../components/insights/InsightsCharts";
import HouseholdAnalysis from "../components/insights/HouseholdAnalysis";
import UsagePatterns from "../components/insights/UsagePatterns";
import SmartInsights from "../components/insights/SmartInsights";
import EnergyTips from "../components/insights/EnergyTips";
import { getEnergyInsights } from "../services/api";
import { normalizeInsights } from "../utils/insights";

const whole = (n) => Math.round(n).toLocaleString("en-PK");

function LoadingSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse" role="status" aria-label="Loading energy insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl border border-line bg-surface" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-2xl border border-line bg-surface" />
        <div className="h-96 rounded-2xl border border-line bg-surface" />
      </div>
      <div className="h-56 rounded-2xl border border-line bg-surface" />
    </div>
  );
}

export default function InsightsPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  // Fetches on every visit to this page and again on Refresh or Try again.
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = normalizeInsights(await getEnergyInsights());
        if (ignore) return;
        setData(result);
        setError("");
      } catch (err) {
        if (ignore) return;
        setError(err.message || "Unable to load energy insights.");
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

  const updatedAt = useMemo(() => {
    const date = data?.generatedAt ? new Date(data.generatedAt) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "";
  }, [data]);

  if (loading) return <LoadingSkeleton />;

  const hasBills = data !== null && data.overview.bills > 0;
  const skipped = data ? data.quality.skippedRecords + data.skippedMonths : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Built only from the electricity bills saved in BijliWise.
          {updatedAt && <> Updated at {updatedAt}.</>}
        </p>
        <button type="button" onClick={refresh} disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand/40 hover:text-brand disabled:opacity-60">
          <RefreshCw size={16} className={refreshing ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <span className="min-w-0 flex-1">{error}{data ? " The figures below are from the last successful load." : ""}</span>
          <button onClick={refresh} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">Try again</button>
        </div>
      )}

      {skipped > 0 && (
        <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200">
          {skipped} {skipped === 1 ? "record was" : "records were"} left out because {skipped === 1 ? "it was" : "they were"} incomplete or invalid.
        </div>
      )}

      {data && !hasBills && !error && (
        <Card className="px-4 py-10 text-center">
          <p className="text-sm font-semibold">No insights yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Insights are built from saved electricity bills. Add your first bill and this page fills in automatically.</p>
          <button onClick={() => onNavigate?.("bills")} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-base transition hover:brightness-110">
            Go to Electricity Bills
          </button>
        </Card>
      )}

      {data && (hasBills || data.months.length > 0) && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Zap} label="Total consumption" value={whole(data.overview.kwh)} unit="kWh" hint="All saved bills" />
            <KpiCard icon={Banknote} label="Total electricity expense" value={whole(data.overview.expense)} unit="PKR" hint="All saved bills" />
            <KpiCard icon={Receipt} label="Saved bills" value={whole(data.overview.bills)} hint={`${data.months.length} billing ${data.months.length === 1 ? "month" : "months"}`} />
            <KpiCard icon={Users} label="Household references" value={whole(data.overview.households)} hint="Distinct consumer references" />
          </div>

          <InsightsCharts months={data.months} comparable={data.quality.monthsComparable} />
          <SmartInsights insights={data.insights} />
          <HouseholdAnalysis households={data.households} />
          <UsagePatterns patterns={data.patterns} quality={data.quality} billCount={data.overview.bills} />
          <EnergyTips />
        </>
      )}

      {data && !hasBills && data.months.length === 0 && !error && <EnergyTips />}
    </div>
  );
}
