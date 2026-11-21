"""Prediction readiness and forecasting service for BijliWise.

What this module does today
---------------------------
* Groups saved bills by household (consumer_reference) and builds one monthly series per household.
* Decides, with plain rules, whether a household has enough history to start forecasting.
* Returns a structured "not available" answer, with the reason, whenever a forecast cannot be trusted.

What it does NOT do
-------------------
* It does not forecast anything. No model is trained, so no prediction is ever returned.
* It never mixes households, invents values, or estimates bills from a made-up tariff.

Connecting a real model later
-----------------------------
Make `load_model()` return an object with this contract (nothing else needs to change):

    model.validated  -> True only after the model passed a proper evaluation on held-out months
    model.metrics    -> {"name": "MAPE", "value": 8.4, "unit": "%"}   (a real evaluation result)
    model.predict(history, horizon) -> [{"month": "2027-01", "consumption_kwh": 210.0,
                                        "lower_kwh": 190.0, "upper_kwh": 232.0}, ...]
        history = [{"month": "2026-01", "units": 200.0, "amount": 6800.0}, ...]  (one household, oldest first)
        lower_kwh / upper_kwh are optional and must come from the model's own uncertainty estimate.

The service still checks every forecast (length, months, numbers) before it is shown.
This file has no database or web code, so it can be tested with plain Python lists.
"""

import math
import os
from collections import defaultdict

from insights import _month_key, _to_float  # same month and number rules as Energy Insights

# A preliminary DATA requirement only. Twelve months do not guarantee a reliable forecast:
# a model must still be trained and validated before forecasts are switched on.
REQUIRED_OBSERVATIONS = 12
ALLOWED_HORIZONS = (1, 3, 6)

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_ARTIFACT = os.path.join(MODEL_DIR, "household_forecast.joblib")

MSG_INSUFFICIENT = "More historical electricity bills are required before we can generate a reliable household forecast."
MSG_NOT_TRAINED = (
    "This household has enough monthly bills to start preparing a model, but no trained and validated "
    "forecasting model is available yet."
)
MSG_UNLOADABLE = (
    "A model file was found, but this version of BijliWise cannot load and check it yet. "
    "Forecasts stay off until it can."
)
MSG_NOT_VALIDATED = "A model is loaded but has not passed validation, so its forecasts are not shown."
MSG_BAD_OUTPUT = "The model did not return a usable forecast, so nothing is shown."
MSG_READY = "Forecast from a trained and validated model. It is an estimate, not a guarantee."

BILL_FORECAST_UNAVAILABLE = {
    "available": False,
    "message": (
        "Bill forecasting is not available yet. A future bill depends on tariff changes, taxes, fuel "
        "adjustments and fixed charges, which cannot be worked out from consumption alone."
    ),
}


# ---------- model hook (the only place a trained model will be connected) ----------

def model_artifact_found():
    return os.path.isfile(MODEL_ARTIFACT)


def load_model():
    """Return a validated model object, or None. No model exists yet, so this returns None."""
    return None


def is_valid_horizon(horizon):
    return isinstance(horizon, int) and not isinstance(horizon, bool) and horizon in ALLOWED_HORIZONS


# ---------- preparing one household's monthly series ----------

def _reference(row):
    value = row.get("consumer_reference") if isinstance(row, dict) else None
    return value.strip() if isinstance(value, str) else ""


def household_rows(rows, consumer_reference):
    """Only this household's rows. Matching is exact, so households are never merged."""
    wanted = (consumer_reference or "").strip()
    return [r for r in rows or [] if wanted and _reference(r) == wanted]


def _prepare(rows):
    """One observation per billing month for ONE household, oldest first.

    * rows with a bad month or bad numbers are counted as invalid and left out
    * a month saved twice with identical values counts once
    * a month saved twice with different values is ambiguous, so it is left out and reported
    """
    invalid = 0
    seen = defaultdict(set)
    for row in rows:
        ok = isinstance(row, dict)
        month = _month_key(row.get("billing_month")) if ok else None
        units = _to_float(row.get("units_consumed")) if ok else None
        amount = _to_float(row.get("total_amount")) if ok else None
        if month is None or units is None or amount is None:
            invalid += 1
            continue
        seen[month].add((units, amount))

    observations, conflicting = [], []
    for month in sorted(seen):
        values = seen[month]
        if len(values) == 1:
            units, amount = next(iter(values))
            observations.append({"month": month, "units": round(units, 2), "amount": round(amount, 2)})
        else:
            conflicting.append(month)
    return observations, invalid, conflicting


def _span_months(first, last):
    y1, m1 = int(first[:4]), int(first[5:7])
    y2, m2 = int(last[:4]), int(last[5:7])
    return (y2 - y1) * 12 + (m2 - m1) + 1


def summarize_households(rows):
    """One line per household for the selector. Rows with no household reference are skipped."""
    groups, skipped = defaultdict(list), 0
    for row in rows or []:
        reference = _reference(row)
        if reference:
            groups[reference].append(row)
        else:
            skipped += 1

    households = []
    for reference in sorted(groups):
        observations, _, _ = _prepare(groups[reference])
        households.append({
            "consumer_reference": reference,
            "observations": len(observations),
            "first_month": observations[0]["month"] if observations else None,
            "last_month": observations[-1]["month"] if observations else None,
            "meets_data_requirement": len(observations) >= REQUIRED_OBSERVATIONS,
        })
    return {"households": households, "skipped_records": skipped}


# ---------- model output checks ----------

def _clean_metrics(model):
    metrics = getattr(model, "metrics", None)
    if not isinstance(metrics, dict) or not isinstance(metrics.get("name"), str):
        return None
    value = metrics.get("value")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    unit = metrics.get("unit")
    return {"name": metrics["name"], "value": round(float(value), 2), "unit": unit if isinstance(unit, str) else ""}


def _sanitize_predictions(raw, horizon, last_history_month):
    """Checked forecast points, or None when anything about the model output looks wrong."""
    if not isinstance(raw, list) or len(raw) != horizon:
        return None
    cleaned, previous = [], last_history_month
    for point in raw:
        if not isinstance(point, dict) or not isinstance(point.get("month"), str):
            return None
        month = _month_key(point["month"])
        value = _to_float(point.get("consumption_kwh"))
        if month is None or value is None or month <= previous:
            return None
        lower, upper = _to_float(point.get("lower_kwh")), _to_float(point.get("upper_kwh"))
        if lower is None or upper is None or not lower <= value <= upper:
            lower = upper = None  # an interval is only shown when the model supplied a consistent one
        cleaned.append({
            "month": month,
            "consumption_kwh": round(value, 2),
            "lower_kwh": None if lower is None else round(lower, 2),
            "upper_kwh": None if upper is None else round(upper, 2),
        })
        previous = month
    return cleaned


# ---------- readiness and forecast ----------

def _availability(count, model):
    if count < REQUIRED_OBSERVATIONS:
        return "insufficient_data", MSG_INSUFFICIENT
    if model is None:
        if model_artifact_found():
            return "forecast_unavailable", MSG_UNLOADABLE
        return "model_not_trained", MSG_NOT_TRAINED
    if getattr(model, "validated", False) is not True:
        return "forecast_unavailable", MSG_NOT_VALIDATED
    return "model_ready", MSG_READY


def build_readiness(consumer_reference, rows, model=None):
    """Readiness of ONE household, or None when the database has no bills for it."""
    own = household_rows(rows, consumer_reference)
    if not own:
        return None

    observations, invalid, conflicting = _prepare(own)
    count = len(observations)
    status, message = _availability(count, model)

    total_units = sum(o["units"] for o in observations)
    first = observations[0]["month"] if observations else None
    last = observations[-1]["month"] if observations else None
    span = _span_months(first, last) if observations else 0

    return {
        "consumer_reference": consumer_reference.strip(),
        "status": status,
        "forecast_available": status == "model_ready",
        "message": message,
        "observations_available": count,
        "observations_required": REQUIRED_OBSERVATIONS,
        "first_month": first,
        "last_month": last,
        "span_months": span,
        "missing_months": span - count,
        "invalid_records": invalid,
        "conflicting_months": conflicting,
        "total_consumption": round(total_units, 2),
        "avg_consumption": round(total_units / count, 2) if count >= 2 else None,
        "model": {
            "artifact_found": model_artifact_found(),
            "trained": model is not None,
            "validated": model is not None and getattr(model, "validated", False) is True,
            "metrics": _clean_metrics(model) if model is not None else None,
        },
        "history": observations,
    }


def build_forecast(consumer_reference, rows, horizon, model=None):
    """Forecast for ONE household. predictions stays None unless a validated model produced them."""
    readiness = build_readiness(consumer_reference, rows, model)
    if readiness is None:
        return None

    result = {
        "available": False,
        "status": readiness["status"],
        "consumer_reference": readiness["consumer_reference"],
        "observations_available": readiness["observations_available"],
        "observations_required": readiness["observations_required"],
        "forecast_horizon": horizon,
        "message": readiness["message"],
        "predictions": None,
        "history": readiness["history"],
        "model": readiness["model"],
        "bill_forecast": BILL_FORECAST_UNAVAILABLE,
    }
    if readiness["status"] != "model_ready":
        return result

    try:
        predictions = _sanitize_predictions(
            model.predict(readiness["history"], horizon), horizon, readiness["last_month"]
        )
    except Exception:
        predictions = None

    if predictions is None:
        result.update(status="forecast_unavailable", message=MSG_BAD_OUTPUT)
        return result

    result.update(available=True, predictions=predictions)
    return result
