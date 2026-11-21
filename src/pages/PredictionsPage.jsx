import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Card from "../components/ui/Card";
import PredictionControls from "../components/predictions/PredictionControls";
import PredictionKpis from "../components/predictions/PredictionKpis";
import ForecastChart from "../components/predictions/ForecastChart";
import BillForecast from "../components/predictions/BillForecast";
import ModelReadiness, { StatusPill } from "../components/predictions/ModelReadiness";
import HistoricalOverview from "../components/predictions/HistoricalOverview";
import PredictionEducation from "../components/predictions/PredictionEducation";
import DemoMode from "../components/predictions/DemoMode";
import { useDemoMode } from "../context/demoModeContext";
import { getForecast, getPredictionHouseholds, getPredictionReadiness } from "../services/api";
import { normalizeForecast, normalizeHouseholds, normalizeReadiness } from "../utils/predictions";

function Skeleton({ blocks }) {
  return (
    <div className="space-y-6 motion-safe:animate-pulse" role="status" aria-label="Loading predictions">
      {blocks.map((h, i) => <div key={i} className={`${h} rounded-2xl border border-line bg-surface`} />)}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span className="min-w-0 flex-1">{message}</span>
      <button onClick={onRetry} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">Try again</button>
    </div>
  );
}

function RealHouseholdPredictions({ onNavigate }) {
  const [households, setHouseholds] = useState([]);
  const [required, setRequired] = useState(12);
  const [householdError, setHouseholdError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const [reference, setReference] = useState("");
  const [horizon, setHorizon] = useState("1");
  const [readiness, setReadiness] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [readinessError, setReadinessError] = useState("");
  const [forecastError, setForecastError] = useState("");

  // Household list: loaded on every visit and on Refresh or Try again.
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const result = normalizeHouseholds(await getPredictionHouseholds());
        if (ignore) return;
        setHouseholds(result.households);
        setRequired(result.required);
        setReference((current) => (result.households.some((h) => h.reference === current) ? current : result.households[0]?.reference ?? ""));
        setHouseholdError("");
      } catch (err) {
        if (ignore) return;
        setHouseholdError(err.message || "Unable to load households.");
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

  // Readiness depends on the household only.
  useEffect(() => {
    if (!reference) return undefined;
    let ignore = false;
    setReadiness(null);
    setReadinessError("");
    getPredictionReadiness(reference)
      .then((data) => { if (!ignore) setReadiness(normalizeReadiness(data)); })
      .catch((err) => { if (!ignore) setReadinessError(err.message || "Unable to check readiness."); });
    return () => {
      ignore = true;
    };
  }, [reference, reloadCount]);

  // The forecast request carries the household AND the selected period.
  useEffect(() => {
    if (!reference) return undefined;
    let ignore = false;
    setForecast(null);
    setForecastError("");
    getForecast(reference, horizon)
      .then((data) => { if (!ignore) setForecast(normalizeForecast(data)); })
      .catch((err) => { if (!ignore) setForecastError(err.message || "Unable to load the forecast."); });
    return () => {
      ignore = true;
    };
  }, [reference, horizon, reloadCount]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadCount((n) => n + 1);
  }, []);

  if (loading) return <Skeleton blocks={["h-40", "h-36", "h-80"]} />;

  if (householdError) return <ErrorBanner message={householdError} onRetry={refresh} />;

  if (households.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="px-4 py-10 text-center">
          <p className="text-sm font-semibold">No households to forecast yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Predictions are made for one household at a time, from its saved monthly bills. Add a bill to create the first household.</p>
          <button onClick={() => onNavigate?.("bills")} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-base transition hover:brightness-110">
            Go to Electricity Bills
          </button>
        </Card>
        <PredictionEducation />
      </div>
    );
  }

  const status = forecast?.status ?? readiness?.status;
  const message = forecastError || forecast?.message || readiness?.message || "";
  const detailsLoading = !readiness && !readinessError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {status && <StatusPill status={status} />}
          <p className="text-sm text-muted">Forecasts appear only when a trained and validated model exists.</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand/40 hover:text-brand disabled:opacity-60">
          <RefreshCw size={16} className={refreshing ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <PredictionControls households={households} reference={reference} onReference={setReference}
        horizon={horizon} onHorizon={setHorizon} required={required} />

      {readinessError && <ErrorBanner message={readinessError} onRetry={refresh} />}
      {forecastError && <ErrorBanner message={forecastError} onRetry={refresh} />}

      <PredictionKpis forecast={forecast} horizon={Number(horizon)} required={required} />
      <ForecastChart forecast={forecast} message={message} />
      <BillForecast message={forecast?.billMessage} />

      {detailsLoading ? (
        <Skeleton blocks={["h-64"]} />
      ) : (
        readiness && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ModelReadiness readiness={readiness} />
            <HistoricalOverview readiness={readiness} />
          </div>
        )
      )}

      <PredictionEducation />
    </div>
  );
}

const MODES = [
  { value: "real", label: "Real Household" },
  { value: "demo", label: "Synthetic Demo" },
];

// Two separate modes: real MySQL households, or the synthetic demo dataset. Never mixed.
export default function PredictionsPage({ onNavigate }) {
  const [mode, setMode] = useState("real");
  const { isDemo } = useDemoMode();
  // In Demo Mode the real-household tab is never offered, so real data cannot be requested.
  if (isDemo) return <DemoMode />;
  return (
    <div className="space-y-6">
      <div role="group" aria-label="Prediction mode" className="inline-flex rounded-xl border border-line bg-surface p-1">
        {MODES.map((m) => (
          <button key={m.value} type="button" onClick={() => setMode(m.value)} aria-pressed={mode === m.value}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === m.value ? "bg-brand text-base" : "text-muted hover:text-brand"}`}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === "real" ? <RealHouseholdPredictions onNavigate={onNavigate} /> : <DemoMode />}
    </div>
  );
}
