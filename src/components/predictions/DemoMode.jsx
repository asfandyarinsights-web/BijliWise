import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, CalendarDays, FlaskConical, Info, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import OptionGroup from "../settings/OptionGroup";
import { useChartColors } from "../../hooks/useChartColors";
import {
  getDemoForecast,
  getDemoHistory,
  getDemoHouseholds,
  getModelMetrics,
} from "../../services/api";

const HORIZON_OPTIONS = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
];

const DISCLAIMER =
  "Demonstration Mode: Predictions are generated using a synthetic electricity consumption dataset created for the BijliWise project. They are not actual meter readings or official utility forecasts.";

const MODEL_DISCLAIMER =
  "This model is trained and evaluated using synthetic demonstration data. Its performance does not establish accuracy on real Pakistani electricity consumers.";

const STEPS = [
  ["Synthetic dataset generation", "A script simulates 50 households over 36 months, with seasons, household size and random variation."],
  ["Historical consumption analysis", "Each household's past monthly units show its own level and its summer and winter pattern."],
  ["Feature engineering", "Last month, two and three months ago, 3 and 6 month averages, and the calendar month are built from past data only."],
  ["Machine-learning model training", "A Random Forest regression model (scikit-learn) learns from the earlier months."],
  ["Time-based evaluation", "The model is tested on 2025 months it never saw during training. No random shuffling."],
  ["Future consumption forecasting", "Each predicted month is fed back in as history to predict the next one."],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthText = (id) => {
  const [y, m] = String(id).split("-");
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : String(id);
};
const kwh = (n) => `${Math.round(n).toLocaleString("en-PK")} kWh`;
const num = (n, d = 2) => (typeof n === "number" ? n.toFixed(d) : "Not available");
const axisNumber = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function ErrorBanner({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span className="min-w-0 flex-1">{message}</span>
      <button onClick={onRetry} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">Try again</button>
    </div>
  );
}

function DemoBanner() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
      <FlaskConical size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{DISCLAIMER}</p>
    </div>
  );
}

function Tile({ icon: Icon, label, value, detail }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={18} aria-hidden="true" /></span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-3 text-xs text-muted">{detail}</p>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const isForecast = p.isForecast;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-ink">{monthText(label)}</p>
      <p className="text-brand">{isForecast ? `Predicted: ${kwh(p.predicted)}` : `Actual: ${kwh(p.actual)}`}</p>
    </div>
  );
}

function UsageChart({ data, colors, label }) {
  const axis = { fill: colors.axis, fontSize: 12 };
  return (
    <div className="h-80 p-3 pt-5" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis dataKey="id" tick={axis} axisLine={false} tickLine={false} tickFormatter={monthText} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={axisNumber} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
          <Line dataKey="actual" stroke={colors.brand} strokeWidth={2.5} dot={{ r: 2.5, fill: colors.brand }} connectNulls={false} isAnimationActive={false} />
          <Line dataKey="predicted" stroke={colors.brand} strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: colors.brand }} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function MetricCard({ name, value, unit, text }) {
  return (
    <div className="rounded-xl border border-line bg-raised/40 p-4">
      <p className="text-xs font-semibold text-muted">{name}</p>
      <p className="mt-1 text-2xl font-bold">{value} <span className="text-sm font-medium text-muted">{unit}</span></p>
      <p className="mt-2 text-xs text-muted">{text}</p>
    </div>
  );
}

function ModelSection({ info, error, onRetry }) {
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!info) {
    return <div className="h-64 rounded-2xl border border-line bg-surface motion-safe:animate-pulse" role="status" aria-label="Loading model metrics" />;
  }
  const m = info.metrics;
  const one = m.one_step_ahead;
  const base = m.persistence_baseline_one_step;
  const ex = info.metric_explanations;
  const horizons = m.recursive_horizon_backtest ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Model performance" subtitle={`${info.model_name}, version ${info.model_version}. Tested on ${info.evaluation_period.start} to ${info.evaluation_period.end}`} />
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard name="MAE" value={num(one.mae)} unit="kWh" text={ex.mae} />
            <MetricCard name="RMSE" value={num(one.rmse)} unit="kWh" text={ex.rmse} />
            <MetricCard name="R²" value={num(one.r2, 3)} unit="" text={ex.r2} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-sm">
              <caption className="sr-only">Forecast error by horizon compared with repeating last month</caption>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">Forecast length</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Model MAE</th>
                  <th scope="col" className="py-2 text-right font-semibold">"Same as last month" MAE</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(horizons).map(([h, v]) => (
                  <tr key={h} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-3 font-normal">{h} {h === "1" ? "month" : "months"}</th>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(v.mae)} kWh</td>
                    <td className="py-2 text-right tabular-nums">{num(v.baseline_mae)} kWh</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            One-step baseline (predict the same as last month): MAE {num(base.mae)} kWh, R² {num(base.r2, 3)}. Longer forecasts are less accurate because each step builds on earlier predictions.
          </p>
          <p className="flex items-start gap-2 rounded-xl border border-line bg-raised/40 px-3 py-2.5 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
            <span>{info.disclaimer || MODEL_DISCLAIMER}</span>
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Model card and dataset" subtitle="What was trained, on what, and its limits" />
        <div className="p-5">
          <dl>
            <Row label="Dataset type">Synthetic (simulated)</Row>
            <Row label="Records">{info.dataset.records.toLocaleString("en-PK")}</Row>
            <Row label="Households">{info.dataset.households}</Row>
            <Row label="Dataset period">{info.dataset.date_range.start} to {info.dataset.date_range.end}</Row>
            <Row label="Training period">{info.training_period.start} to {info.training_period.end}</Row>
            <Row label="Evaluation period">{info.evaluation_period.start} to {info.evaluation_period.end}</Row>
          </dl>
          <p className="mt-4 text-sm"><span className="font-semibold">Intended use: </span><span className="text-muted">{info.model_card.intended_use}</span></p>
          <p className="mt-3 text-sm font-semibold">Limitations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
            {info.model_card.limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function DemoMode() {
  const colors = useChartColors();
  const [reloadCount, setReloadCount] = useState(0);

  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [householdError, setHouseholdError] = useState("");
  const [modelInfo, setModelInfo] = useState(null);
  const [modelError, setModelError] = useState("");

  const [reference, setReference] = useState("");
  const [horizon, setHorizon] = useState("3");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [forecast, setForecast] = useState(null);
  const [forecastError, setForecastError] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setModelInfo(null);
    setModelError("");
    getDemoHouseholds()
      .then((list) => {
        if (ignore) return;
        setHouseholds(list);
        setReference((cur) => (list.some((h) => h.consumer_reference === cur) ? cur : list[0]?.consumer_reference ?? ""));
        setHouseholdError("");
      })
      .catch((err) => { if (!ignore) setHouseholdError(err.message || "Unable to load synthetic households."); })
      .finally(() => { if (!ignore) setLoading(false); });
    getModelMetrics()
      .then((info) => { if (!ignore) setModelInfo(info); })
      .catch((err) => { if (!ignore) setModelError(err.message || "Unable to load model metrics."); });
    return () => { ignore = true; };
  }, [reloadCount]);

  useEffect(() => {
    if (!reference) return undefined;
    let ignore = false;
    setHistory(null);
    setHistoryError("");
    getDemoHistory(reference)
      .then((data) => { if (!ignore) setHistory(data); })
      .catch((err) => { if (!ignore) setHistoryError(err.message || "Unable to load history."); });
    return () => { ignore = true; };
  }, [reference, reloadCount]);

  const retry = useCallback(() => setReloadCount((n) => n + 1), []);

  const changeReference = (value) => { setReference(value); setForecast(null); setForecastError(""); };
  const changeHorizon = (value) => { setHorizon(value); setForecast(null); setForecastError(""); };

  async function generate() {
    setGenerating(true);
    setForecastError("");
    try {
      setForecast(await getDemoForecast(reference, horizon));
    } catch (err) {
      setForecast(null);
      setForecastError(err.message || "Unable to generate the forecast.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 motion-safe:animate-pulse" role="status" aria-label="Loading demo mode">
        {["h-14", "h-40", "h-80"].map((h) => <div key={h} className={`${h} rounded-2xl border border-line bg-surface`} />)}
      </div>
    );
  }
  if (householdError) {
    return (
      <div className="space-y-4">
        <DemoBanner />
        <ErrorBanner message={`${householdError} Make sure the backend is running and the dataset and model have been generated.`} onRetry={retry} />
      </div>
    );
  }
  if (households.length === 0) {
    return (
      <div className="space-y-4">
        <DemoBanner />
        <Card className="px-4 py-10 text-center">
          <p className="text-sm font-semibold">No synthetic households found</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Run python generate_dataset.py and python train_prediction_model.py in the backend folder, then try again.</p>
          <button onClick={retry} className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-brand/40 hover:text-brand">Try again</button>
        </Card>
      </div>
    );
  }

  const profile = history?.household ?? households.find((h) => h.consumer_reference === reference);
  const historyData = (history?.history ?? []).map((h) => ({ id: h.month, actual: h.units_consumed, predicted: null, isForecast: false }));

  let combined = [];
  if (forecast && historyData.length) {
    const recent = historyData.slice(-24).map((d) => ({ ...d }));
    recent[recent.length - 1].predicted = recent[recent.length - 1].actual; // join the lines
    combined = [...recent, ...forecast.forecast.map((f) => ({ id: f.month, actual: null, predicted: f.predicted_kwh, isForecast: true }))];
  }

  const total = forecast?.total_predicted_kwh ?? 0;
  const count = forecast?.forecast.length ?? 0;
  const horizonMae = modelInfo?.metrics?.recursive_horizon_backtest?.[String(forecast?.horizon)]?.mae;

  return (
    <div className="space-y-6">
      <DemoBanner />

      <Card className="grid gap-5 p-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div>
          <label htmlFor="demo-household" className="mb-2 block text-sm font-semibold">Synthetic household</label>
          <select id="demo-household" value={reference} onChange={(e) => changeReference(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold focus:border-brand/50 focus:outline-none">
            {households.map((h) => (
              <option key={h.consumer_reference} value={h.consumer_reference}>
                {h.consumer_reference} ({h.city}, {h.household_size} people)
              </option>
            ))}
          </select>
          {profile && (
            <dl className="mt-3 space-y-1 text-xs text-muted">
              <div className="flex justify-between gap-3"><dt>City</dt><dd className="font-semibold text-ink">{profile.city}</dd></div>
              <div className="flex justify-between gap-3"><dt>Household size</dt><dd className="font-semibold text-ink">{profile.household_size}</dd></div>
              <div className="flex justify-between gap-3"><dt>Usage profile</dt><dd className="font-semibold text-ink">{String(profile.usage_profile).replace("_", " ")}</dd></div>
              <div className="flex justify-between gap-3"><dt>Average per month</dt><dd className="font-semibold text-ink">{kwh(profile.average_monthly_kwh)}</dd></div>
            </dl>
          )}
        </div>
        <div className="space-y-4">
          <OptionGroup legend="Forecast period" name="demoHorizon" value={horizon} onChange={changeHorizon}
            options={HORIZON_OPTIONS} hint="Sent to the server with the forecast request." />
          <button type="button" onClick={generate} disabled={generating || !reference}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-base transition hover:brightness-110 disabled:opacity-60">
            <RefreshCw size={16} className={generating ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
            {generating ? "Generating" : "Generate Forecast"}
          </button>
        </div>
      </Card>

      {forecastError && <ErrorBanner message={forecastError} onRetry={generate} />}

      {forecast && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={Zap} label="Predicted consumption" value={kwh(total)} detail={`Total for the next ${count} ${count === 1 ? "month" : "months"}.`} />
          <Tile icon={Zap} label="Average per month" value={kwh(total / count)} detail="Predicted total divided by months." />
          <Tile icon={CalendarDays} label="Forecast period"
            value={count === 1 ? monthText(forecast.forecast[0].month) : `${monthText(forecast.forecast[0].month)} to ${monthText(forecast.forecast[count - 1].month)}`}
            detail={`After the last recorded month, ${monthText(forecast.last_observed_month)}.`} />
          <Tile icon={ShieldCheck} label="Typical error at this length"
            value={horizonMae === undefined ? "Not available" : `${num(horizonMae)} kWh`}
            detail={`Measured MAE on synthetic test months. Model version ${forecast.model_version}.`} />
        </div>
      )}

      <Card>
        <CardHeader title="Historical consumption" subtitle={`Actual synthetic monthly usage for ${reference}`} />
        {historyError ? (
          <div className="p-5"><ErrorBanner message={historyError} onRetry={retry} /></div>
        ) : !history ? (
          <div className="h-80 motion-safe:animate-pulse" role="status" aria-label="Loading history" />
        ) : (
          <UsageChart data={historyData} colors={colors} label={`Historical monthly consumption for ${reference}`} />
        )}
      </Card>

      <Card>
        <CardHeader title="Historical versus predicted" subtitle="Solid line is actual synthetic usage (last 24 months), dashed line is the model forecast" />
        {forecast ? (
          <UsageChart data={combined} colors={colors} label={`Historical and predicted consumption for ${reference}`} />
        ) : (
          <div className="grid place-items-center px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><AlertCircle size={22} aria-hidden="true" /></span>
            <p className="mt-4 text-base font-semibold">No forecast generated yet</p>
            <p className="mt-1 max-w-lg text-sm text-muted">Choose a household and a period, then press Generate Forecast.</p>
          </div>
        )}
      </Card>

      <ModelSection info={modelInfo} error={modelError} onRetry={retry} />

      <Card>
        <CardHeader title="How BijliWise AI Prediction Works" subtitle="The six steps used in this demonstration" />
        <ol className="grid gap-3 p-5 md:grid-cols-2">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-3 rounded-xl border border-line bg-raised/40 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
