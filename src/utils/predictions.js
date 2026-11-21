import { toNonNegativeNumber } from "./analytics";

// Turns the /api/predictions/* responses into safe data. Anything malformed becomes empty or "unavailable".

export const HORIZONS = [
  { value: "1", label: "Next month", months: 1 },
  { value: "3", label: "Next 3 months", months: 3 },
  { value: "6", label: "Next 6 months", months: 6 },
];

export const horizonLabel = (months) => HORIZONS.find((h) => h.months === Number(months))?.label ?? `Next ${months} months`;

// tone decides the colour: ready = brand green, warn = amber, muted = neutral.
export const STATUS_META = {
  model_ready: { label: "Model Ready", tone: "ready" },
  insufficient_data: { label: "Insufficient Data", tone: "warn" },
  model_not_trained: { label: "Model Not Trained", tone: "warn" },
  forecast_unavailable: { label: "Forecast Unavailable", tone: "muted" },
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v) => toNonNegativeNumber(v);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = (v) => (typeof v === "string" && MONTH.test(v) ? v : null);

// Unknown statuses are treated as "unavailable" so the UI can never show Model Ready by mistake.
const statusOf = (v) => (v in STATUS_META ? v : "forecast_unavailable");

export function normalizeHouseholds(data) {
  if (!isObject(data)) throw new Error("The server sent an unexpected response.");
  const households = (Array.isArray(data.households) ? data.households : [])
    .filter((h) => isObject(h) && typeof h.consumer_reference === "string" && h.consumer_reference !== "")
    .map((h) => ({
      reference: h.consumer_reference,
      observations: num(h.observations) ?? 0,
      firstMonth: month(h.first_month),
      lastMonth: month(h.last_month),
    }));
  return { households, required: num(data.required_observations) ?? 12 };
}

function normalizeModel(raw) {
  const model = isObject(raw) ? raw : {};
  const m = isObject(model.metrics) && typeof model.metrics.name === "string" && Number.isFinite(model.metrics.value) ? model.metrics : null;
  return {
    artifactFound: model.artifact_found === true,
    trained: model.trained === true,
    validated: model.validated === true,
    metrics: m ? { name: m.name, value: m.value, unit: typeof m.unit === "string" ? m.unit : "" } : null,
  };
}

function normalizeHistory(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((h) => (isObject(h) && month(h.month) && num(h.units) !== null && num(h.amount) !== null
      ? { month: h.month, units: h.units, amount: h.amount } : null))
    .filter(Boolean);
}

export function normalizeReadiness(data) {
  if (!isObject(data)) throw new Error("The server sent an unexpected response.");
  return {
    reference: typeof data.consumer_reference === "string" ? data.consumer_reference : "",
    status: statusOf(data.status),
    message: typeof data.message === "string" ? data.message : "",
    available: data.forecast_available === true && data.status === "model_ready",
    observations: num(data.observations_available) ?? 0,
    required: num(data.observations_required) ?? 12,
    firstMonth: month(data.first_month),
    lastMonth: month(data.last_month),
    spanMonths: num(data.span_months) ?? 0,
    missingMonths: num(data.missing_months) ?? 0,
    invalidRecords: num(data.invalid_records) ?? 0,
    conflictingMonths: (Array.isArray(data.conflicting_months) ? data.conflicting_months : []).filter((m) => month(m)),
    totalKwh: num(data.total_consumption) ?? 0,
    avgKwh: num(data.avg_consumption),
    model: normalizeModel(data.model),
    history: normalizeHistory(data.history),
  };
}

function normalizePredictions(raw, horizon) {
  if (!Array.isArray(raw) || raw.length !== horizon) return null;
  const points = raw.map((p) => {
    if (!isObject(p) || !month(p.month) || num(p.consumption_kwh) === null) return null;
    const lower = num(p.lower_kwh);
    const upper = num(p.upper_kwh);
    const range = lower !== null && upper !== null && lower <= p.consumption_kwh && p.consumption_kwh <= upper;
    return { month: p.month, kwh: p.consumption_kwh, lower: range ? lower : null, upper: range ? upper : null };
  });
  return points.every(Boolean) ? points : null;
}

// Forecast numbers are only accepted when the backend says a model is ready AND the points are well formed.
export function normalizeForecast(data) {
  if (!isObject(data)) throw new Error("The server sent an unexpected response.");
  const horizon = num(data.forecast_horizon) ?? 0;
  const predictions = data.available === true && data.status === "model_ready" ? normalizePredictions(data.predictions, horizon) : null;
  const status = predictions ? "model_ready" : data.status === "model_ready" ? "forecast_unavailable" : statusOf(data.status);
  return {
    available: predictions !== null,
    status,
    message: typeof data.message === "string" ? data.message : "",
    horizon,
    observations: num(data.observations_available) ?? 0,
    required: num(data.observations_required) ?? 12,
    predictions,
    history: normalizeHistory(data.history),
    model: normalizeModel(data.model),
    billMessage: isObject(data.bill_forecast) && typeof data.bill_forecast.message === "string" ? data.bill_forecast.message : "",
  };
}

// History and forecast as one chart series. Forecast points never overwrite history months.
export function buildChartSeries(history, predictions) {
  const rows = history.map((h) => ({ id: h.month, actual: h.units, predicted: null, range: null }));
  for (const p of predictions ?? []) {
    rows.push({ id: p.month, actual: null, predicted: p.kwh, range: p.lower !== null ? [p.lower, p.upper] : null });
  }
  return rows;
}
