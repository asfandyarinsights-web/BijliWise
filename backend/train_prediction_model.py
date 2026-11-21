"""Train and evaluate the demo consumption model on the synthetic dataset.

Run:  python train_prediction_model.py
"""
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from generate_dataset import CSV_NAME, DATA_DIR, validate_dataset
from prediction_features import (FEATURE_COLUMNS, MIN_HISTORY, TARGET,
                                 build_training_frame, recursive_forecast)

BACKEND_DIR = Path(__file__).resolve().parent
MODEL_DIR = BACKEND_DIR / "models"
MODEL_FILE = "consumption_model.joblib"
MODEL_VERSION = "1.0.0"
SPLIT_MONTH = "2025-01"  # train: before this month; evaluate: this month onward
HORIZONS = (1, 3, 6)
RF_PARAMS = dict(n_estimators=300, min_samples_leaf=2, max_features=0.7, random_state=42, n_jobs=1)

DISCLAIMER = ("This model is trained and evaluated using synthetic demonstration data. Its performance "
              "does not establish accuracy on real Pakistani electricity consumers.")


def _regression_metrics(y, p) -> dict:
    y, p = np.asarray(y, float), np.asarray(p, float)
    m = {"mae": float(mean_absolute_error(y, p)),
         "rmse": float(np.sqrt(mean_squared_error(y, p))),
         "r2": float(r2_score(y, p))}
    if (y > 0).all():  # MAPE is only defined when all actual values are positive
        m["mape_percent"] = float(np.mean(np.abs((y - p) / y)) * 100)
    return {k: round(v, 4) for k, v in m.items()}


def _horizon_backtest(model, df: pd.DataFrame, horizon: int, first_origin: int) -> dict:
    """Recursive forecasts from origins the model never trained on."""
    errs_m, errs_b = [], []
    for _, g in df.sort_values("billing_month").groupby("consumer_reference"):
        vals = g[TARGET].tolist()
        months = g["billing_month"].tolist()
        size = int(g["household_size"].iloc[0])
        for o in range(first_origin, len(vals) - horizon + 1):
            fc = recursive_forecast(model, vals[:o], size, months[o - 1], horizon)
            actual = vals[o:o + horizon]
            errs_m += [f["predicted_kwh"] - a for f, a in zip(fc, actual)]
            errs_b += [vals[o - 1] - a for a in actual]  # persistence baseline
    em, eb = np.array(errs_m), np.array(errs_b)
    return {"mae": round(float(np.abs(em).mean()), 4), "rmse": round(float(np.sqrt((em ** 2).mean())), 4),
            "baseline_mae": round(float(np.abs(eb).mean()), 4),
            "baseline_rmse": round(float(np.sqrt((eb ** 2).mean())), 4), "n_forecast_points": int(len(em))}


def train(data_dir: Path = DATA_DIR, model_dir: Path = MODEL_DIR) -> dict:
    data_dir, model_dir = Path(data_dir), Path(model_dir)
    csv_path = data_dir / CSV_NAME
    if not csv_path.exists():
        raise FileNotFoundError(f"{csv_path} not found. Run generate_dataset.py first.")
    df = pd.read_csv(csv_path)
    report = validate_dataset(df)
    if not report["passed"]:
        raise ValueError(f"Dataset validation failed: {report['problems']}")
    df = df.sort_values(["consumer_reference", "billing_month"]).reset_index(drop=True)

    frame = build_training_frame(df)
    train_f = frame[frame["billing_month"] < SPLIT_MONTH]
    test_f = frame[frame["billing_month"] >= SPLIT_MONTH]
    if train_f.empty or test_f.empty:
        raise ValueError("Chronological split produced an empty train or test set")

    model = RandomForestRegressor(**RF_PARAMS)
    model.fit(train_f[FEATURE_COLUMNS], train_f[TARGET])

    pred = model.predict(test_f[FEATURE_COLUMNS])
    one_step = _regression_metrics(test_f[TARGET], pred)
    baseline = _regression_metrics(test_f[TARGET], test_f["lag_1"])  # "same as last month"

    first_origin = int(df.groupby("consumer_reference").cumcount().max() + 1) - 12  # first 2025 month index
    horizon_metrics = {str(h): _horizon_backtest(model, df, h, first_origin) for h in HORIZONS}

    importances = sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: -x[1])
    metrics = {
        "evaluation_type": "chronological hold-out on synthetic data",
        "one_step_ahead": one_step,
        "persistence_baseline_one_step": baseline,
        "recursive_horizon_backtest": horizon_metrics,
        "feature_importance": {k: round(float(v), 4) for k, v in importances},
        "train_rows": int(len(train_f)), "evaluation_rows": int(len(test_f)),
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / MODEL_FILE
    joblib.dump(model, model_path)
    sha = hashlib.sha256(model_path.read_bytes()).hexdigest()

    train_months, test_months = sorted(train_f["billing_month"].unique()), sorted(test_f["billing_month"].unique())
    metadata = {
        "model_name": "RandomForestRegressor (scikit-learn)",
        "model_version": MODEL_VERSION,
        "dataset_type": "synthetic_demo",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model_file": MODEL_FILE, "model_sha256": sha,
        "environment": {"sklearn_version": sklearn.__version__, "python": platform.python_version()},
        "feature_schema": FEATURE_COLUMNS, "min_history_months": MIN_HISTORY, "target": TARGET,
        "training_config": {"algorithm_params": RF_PARAMS, "split_month": SPLIT_MONTH,
                            "forecasting": "recursive multi-step", "horizons": list(HORIZONS)},
        "dataset": {"records": report["total_records"], "households": report["total_households"],
                    "date_range": report["date_range"], "source_file": CSV_NAME},
        "training_period": {"start": train_months[0], "end": train_months[-1]},
        "evaluation_period": {"start": test_months[0], "end": test_months[-1]},
        "model_card": {
            "intended_use": "Classroom/exhibition demonstration of an ML forecasting workflow in BijliWise.",
            "limitations": ["Trained only on simulated households, not real meter readings.",
                            "Recursive multi-month forecasts accumulate error.",
                            "Does not model tariffs, outages, appliances, or real weather."],
            "disclaimer": DISCLAIMER},
    }
    (model_dir / "model_metrics.json").write_text(json.dumps(metrics, indent=2))
    (model_dir / "model_metadata.json").write_text(json.dumps(metadata, indent=2))
    return {"metrics": metrics, "metadata": metadata}


if __name__ == "__main__":
    out = train()
    print(json.dumps(out["metrics"], indent=2))
