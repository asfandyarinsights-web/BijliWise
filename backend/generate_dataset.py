"""Generate the synthetic BijliWise demo dataset (reproducible, overwrite-safe).

Run:  python generate_dataset.py
"""
import json
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
CSV_NAME = "synthetic_electricity_usage.csv"
REPORT_NAME = "dataset_validation_report.json"

SEED = 42
N_HOUSEHOLDS = 50
START_MONTH = "2023-01"
N_MONTHS = 36

REQUIRED_COLUMNS = [
    "consumer_reference", "billing_month", "household_size", "city", "season",
    "month", "previous_month_consumption", "units_consumed",
]
CITY_CLIMATE = {  # relative cooling demand
    "Karachi": 1.0, "Lahore": 1.05, "Islamabad": 0.85, "Nawabshah": 1.2,
    "Multan": 1.15, "Quetta": 0.6, "Peshawar": 1.0, "Faisalabad": 1.05,
    "Hyderabad": 1.15, "Sukkur": 1.2,
}
PROFILES = {  # (base multiplier, cooling multiplier)
    "energy_saver": (0.8, 0.6), "typical": (1.0, 1.0), "high_cooling": (1.15, 1.35),
}
MIN_KWH, MAX_KWH = 40.0, 1500.0


def season_for(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4):
        return "spring"
    if month in (5, 6, 7, 8, 9):
        return "summer"
    return "autumn"


def _cooling_curve(m: int) -> float:  # peaks in July, zero Nov-Mar
    return max(0.0, float(np.cos((m - 7) * np.pi / 6)))


def _winter_curve(m: int) -> float:  # peaks in January
    d = min(abs(m - 1), 12 - abs(m - 1))
    return max(0.0, 1 - d / 2)


def validate_dataset(df: pd.DataFrame) -> dict:
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")
    counts = df.groupby("consumer_reference").size()
    report = {
        "total_records": int(len(df)),
        "total_households": int(df["consumer_reference"].nunique()),
        "date_range": {"start": str(df["billing_month"].min()), "end": str(df["billing_month"].max())},
        "missing_values": {c: int(v) for c, v in df[REQUIRED_COLUMNS].isna().sum().items()},
        "duplicate_household_months": int(df.duplicated(["consumer_reference", "billing_month"]).sum()),
        "fully_duplicated_rows": int(df.duplicated().sum()),
        "consumption_kwh": {
            "min": round(float(df["units_consumed"].min()), 2),
            "max": round(float(df["units_consumed"].max()), 2),
            "mean": round(float(df["units_consumed"].mean()), 2),
        },
        "observations_per_household": {"min": int(counts.min()), "max": int(counts.max())},
        "negative_values": int((df["units_consumed"] < 0).sum()),
    }
    problems = []
    if any(report["missing_values"].values()):
        problems.append("missing values present")
    if report["duplicate_household_months"]:
        problems.append("duplicate household-month records")
    if report["negative_values"]:
        problems.append("negative consumption")
    report["passed"] = not problems
    report["problems"] = problems
    return report


def build_dataset(seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    months = pd.period_range(START_MONTH, periods=N_MONTHS, freq="M")
    # index 0 is a hidden pre-period month so month 1 has a real previous value
    sim_months = [months[0] - 1] + list(months)
    T = len(sim_months)
    weather = np.clip(rng.normal(1.0, 0.08, T), 0.8, 1.25)  # shared monthly weather shock
    cities = list(CITY_CLIMATE)
    rows = []
    for i in range(N_HOUSEHOLDS):
        ref = f"DEMO-{1001 + i}"
        size = int(rng.choice(range(2, 10), p=[.1, .15, .2, .2, .15, .1, .06, .04]))
        city = cities[int(rng.integers(len(cities)))]
        profile = str(rng.choice(list(PROFILES), p=[.25, .5, .25]))
        base_mult, cool_mult = PROFILES[profile]
        base = (70 + 38 * size * rng.uniform(0.8, 1.2)) * base_mult
        cool = rng.uniform(0.35, 0.9) * cool_mult * CITY_CLIMATE[city]
        winter = rng.uniform(0.04, 0.16)
        trend = rng.normal(0.002, 0.004)
        e, vals = 0.0, []
        for t, p in enumerate(sim_months):
            e = 0.4 * e + rng.normal(0, 0.06)
            lvl = base * (1 + trend * t)
            lvl *= 1 + cool * _cooling_curve(p.month) * weather[t] + winter * _winter_curve(p.month)
            lvl *= np.exp(e)
            if rng.random() < 0.02:  # occasional guests / extra appliance use
                lvl *= rng.uniform(1.12, 1.25)
            vals.append(float(np.clip(lvl, MIN_KWH, MAX_KWH)))
        for t in range(1, T):
            p = sim_months[t]
            rows.append({
                "consumer_reference": ref, "billing_month": str(p), "household_size": size,
                "city": city, "season": season_for(p.month), "month": p.month,
                "previous_month_consumption": round(vals[t - 1], 1),
                "units_consumed": round(vals[t], 1), "usage_profile": profile,
            })
    df = pd.DataFrame(rows).sort_values(["consumer_reference", "billing_month"]).reset_index(drop=True)
    return df


def generate(output_dir: Path = DATA_DIR, seed: int = SEED):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    df = build_dataset(seed)
    report = validate_dataset(df)
    if not report["passed"]:
        raise RuntimeError(f"Generated dataset failed validation: {report['problems']}")
    df.to_csv(output_dir / CSV_NAME, index=False)  # overwrite, never append
    report["seed"] = seed
    (output_dir / REPORT_NAME).write_text(json.dumps(report, indent=2))
    return df, report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=SEED)
    args = ap.parse_args()
    _, rep = generate(seed=args.seed)
    print(json.dumps(rep, indent=2))
