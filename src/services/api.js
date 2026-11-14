const API_BASE_URL = "http://127.0.0.1:8000";

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

export async function getBills() {
  const response = await fetch(`${API_BASE_URL}/api/bills`);

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
    throw new Error("Cannot reach the server. Check that the FastAPI backend is running.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `The bill could not be saved (server error ${response.status}).`));
  }

  return response.json().catch(() => null);
}