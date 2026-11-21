const API_BASE_URL = "http://127.0.0.1:8000";

const UNREACHABLE_MESSAGE = "Cannot reach the server. Check that the FastAPI backend is running.";

// Turns a FastAPI error body into one readable sentence.
async function readErrorMessage(response, fallback) {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .join(" ");
    }
  } catch {
    // Response body was not JSON; use the fallback.
  }
  return fallback;
}

// Builds an Error that also carries the HTTP status (for example 404 or 409).
async function responseError(response, fallback) {
  const error = new Error(await readErrorMessage(response, fallback));
  error.status = response.status;
  return error;
}

export async function getBills() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bills`);
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error("Failed to fetch electricity bills.");
  }

  const data = await response.json();

  return data.bills;
}

export async function createBill(bill) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bill),
    });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `The bill could not be saved (server error ${response.status}).`));
  }

  return response.json().catch(() => null);
}

export async function updateBill(billId, bill) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bill),
    });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw await responseError(response, `The bill could not be updated (server error ${response.status}).`);
  }

  return response.json().catch(() => null);
}

export async function deleteBill(billId) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw await responseError(response, `The bill could not be deleted (server error ${response.status}).`);
  }

  return response.json().catch(() => null);
}

export async function getMonthlyAnalytics() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analytics/monthly`);
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error("Failed to fetch monthly analytics.");
  }

  const data = await response.json();

  return data.analytics;
}

export async function getEnergyInsights() {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/insights/energy`);
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Failed to fetch energy insights (server error ${response.status}).`));
  }

  return response.json();
}

async function getJson(path, failure) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }

  if (!response.ok) {
    throw await responseError(response, `${failure} (server error ${response.status}).`);
  }

  return response.json();
}

export const getPredictionHouseholds = () =>
  getJson("/api/predictions/households", "Failed to load households");

export const getPredictionReadiness = (consumerReference) =>
  getJson(`/api/predictions/readiness/${encodeURIComponent(consumerReference)}`, "Failed to check forecasting readiness");

export const getForecast = (consumerReference, horizon) =>
  getJson(
    `/api/predictions/forecast/${encodeURIComponent(consumerReference)}?horizon=${encodeURIComponent(horizon)}`,
    "Failed to load the forecast"
  );

// ---- Synthetic Demo Mode (does not use MySQL data)
export const getDemoHouseholds = () =>
  getJson("/api/predictions/demo/households", "Failed to load synthetic households");

export const getDemoHistory = (consumerReference) =>
  getJson(`/api/predictions/demo/history/${encodeURIComponent(consumerReference)}`, "Failed to load synthetic history");

export const getDemoForecast = (consumerReference, horizon) =>
  getJson(
    `/api/predictions/demo/forecast/${encodeURIComponent(consumerReference)}?horizon=${encodeURIComponent(horizon)}`,
    "Failed to generate the demo forecast"
  );

export const getModelMetrics = () =>
  getJson("/api/predictions/model-metrics", "Failed to load model metrics");
