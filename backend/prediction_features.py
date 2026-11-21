"""Feature engineering shared by training and inference (past values only)."""
import numpy as np
import pandas as pd

MIN_HISTORY = 6  # months of past data needed before a feature row can be built
FEATURE_COLUMNS = [
    "household_size", "month", "month_sin", "month_cos", "is_summer",
    "lag_1", "lag_2", "lag_3", "roll_mean_3", "roll_mean_6",
]
TARGET = "units_consumed"


def build_feature_row(history, household_size: int, target_month: int) -> dict:
    """Features for predicting the month AFTER `history` (oldest -> newest)."""
    if len(history) < MIN_HISTORY:
        raise ValueError(f"Need at least {MIN_HISTORY} months of history, got {len(history)}")
    h = [float(x) for x in history]
    return {
        "household_size": int(household_size),
        "month": int(target_month),
        "month_sin": float(np.sin(2 * np.pi * target_month / 12)),
        "month_cos": float(np.cos(2 * np.pi * target_month / 12)),
        "is_summer": int(5 <= target_month <= 9),
        "lag_1": h[-1], "lag_2": h[-2], "lag_3": h[-3],
        "roll_mean_3": float(np.mean(h[-3:])),
        "roll_mean_6": float(np.mean(h[-6:])),
    }


def build_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    """One row per household-month with >= MIN_HISTORY earlier months.
    Each row is built only from values strictly before its own month."""
    out = []
    df = df.sort_values(["consumer_reference", "billing_month"])
    for ref, g in df.groupby("consumer_reference", sort=True):
        vals = g[TARGET].tolist()
        months = g["billing_month"].tolist()
        size = int(g["household_size"].iloc[0])
        for i in range(MIN_HISTORY, len(vals)):
            row = build_feature_row(vals[:i], size, int(str(months[i])[5:7]))
            row.update(consumer_reference=ref, billing_month=str(months[i]), **{TARGET: vals[i]})
            out.append(row)
    return pd.DataFrame(out)


def recursive_forecast(model, history, household_size: int, last_month: str, horizon: int):
    """Multi-step forecast; each prediction is appended to history for the next step."""
    hist = [float(x) for x in history]
    period = pd.Period(last_month, freq="M")
    results = []
    for step in range(1, horizon + 1):
        target = period + step
        row = build_feature_row(hist, household_size, target.month)
        pred = float(model.predict(pd.DataFrame([row])[FEATURE_COLUMNS])[0])
        pred = round(max(0.0, pred), 2)
        hist.append(pred)
        results.append({"month": str(target), "predicted_kwh": pred, "step": step})
    return results
