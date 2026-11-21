"""Synthetic Demo Mode API. Independent of MySQL.
In main.py add:   from demo_predictions import router as demo_router
                  app.include_router(demo_router)
"""
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd
import sklearn
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from generate_dataset import CSV_NAME, DATA_DIR
from prediction_features import MIN_HISTORY, recursive_forecast
from train_prediction_model import DISCLAIMER, MODEL_DIR, MODEL_FILE

DATA_PATH = Path(DATA_DIR) / CSV_NAME
MODEL_PATH = Path(MODEL_DIR)
ALLOWED_HORIZONS = (1, 3, 6)
DEMO_BANNER = ("Demonstration Mode: Predictions are generated using a synthetic electricity consumption "
               "dataset created for the BijliWise project. They are not actual meter readings or "
               "official utility forecasts.")
router = APIRouter(prefix="/api/predictions", tags=["predictions-demo"])
_cache: Dict[str, Any] = {}


class DemoDataError(Exception):
    pass


def clear_cache():
    _cache.clear()


def _dataset() -> pd.DataFrame:
    if "df" not in _cache:
        if not DATA_PATH.exists():
            raise DemoDataError("Synthetic dataset not found. Run: python generate_dataset.py")
        _cache["df"] = pd.read_csv(DATA_PATH).sort_values(["consumer_reference", "billing_month"])
    return _cache["df"]


def _metadata() -> dict:
    p = MODEL_PATH / "model_metadata.json"
    if not p.exists():
        raise DemoDataError("Model metadata not found. Run: python train_prediction_model.py")
    return json.loads(p.read_text())


def _model():
    if "model" not in _cache:
        meta = _metadata()
        mp = MODEL_PATH / MODEL_FILE
        if not mp.exists():
            raise DemoDataError("Trained model not found. Run: python train_prediction_model.py")
        if hashlib.sha256(mp.read_bytes()).hexdigest() != meta.get("model_sha256"):
            raise DemoDataError("Model file does not match its metadata checksum. Retrain the model.")
        if meta["environment"]["sklearn_version"].split(".")[:2] != sklearn.__version__.split(".")[:2]:
            raise DemoDataError("Model was trained with a different scikit-learn version. Retrain the model.")
        _cache["model"] = joblib.load(mp)
    return _cache["model"]


def _household(ref: str) -> pd.DataFrame:
    g = _dataset()
    g = g[g["consumer_reference"] == ref]
    if g.empty:
        raise HTTPException(404, f"Synthetic household '{ref}' not found")
    return g


class HouseholdSummary(BaseModel):
    consumer_reference: str
    city: str
    household_size: int
    usage_profile: str
    average_monthly_kwh: float
    latest_month: str
    latest_kwh: float


class HistoryPoint(BaseModel):
    month: str
    units_consumed: float


class HistoryResponse(BaseModel):
    household: HouseholdSummary
    history: List[HistoryPoint]
    dataset_type: str = "synthetic_demo"
    disclaimer: str = DEMO_BANNER


class ForecastPoint(BaseModel):
    month: str
    predicted_kwh: float
    step: int


class ForecastResponse(BaseModel):
    consumer_reference: str
    horizon: int
    last_observed_month: str
    forecast: List[ForecastPoint]
    total_predicted_kwh: float
    model_version: str
    dataset_type: str = "synthetic_demo"
    disclaimer: str = DEMO_BANNER


class MetricsResponse(BaseModel):
    model_name: str
    model_version: str
    dataset_type: str
    dataset: Dict[str, Any]
    training_period: Dict[str, str]
    evaluation_period: Dict[str, str]
    metrics: Dict[str, Any]
    metric_explanations: Dict[str, str]
    model_card: Dict[str, Any]
    disclaimer: str = DISCLAIMER


def _summary(g: pd.DataFrame) -> HouseholdSummary:
    last = g.iloc[-1]
    return HouseholdSummary(
        consumer_reference=str(last["consumer_reference"]), city=str(last["city"]),
        household_size=int(last["household_size"]), usage_profile=str(last.get("usage_profile", "n/a")),
        average_monthly_kwh=round(float(g["units_consumed"].mean()), 1),
        latest_month=str(last["billing_month"]), latest_kwh=float(last["units_consumed"]))


def _guard(fn):
    try:
        return fn()
    except DemoDataError as e:
        raise HTTPException(503, str(e))


@router.get("/demo/households", response_model=List[HouseholdSummary])
def list_demo_households():
    df = _guard(_dataset)
    return [_summary(g) for _, g in df.groupby("consumer_reference", sort=True)]


@router.get("/demo/history/{consumer_reference}", response_model=HistoryResponse)
def demo_history(consumer_reference: str):
    g = _guard(lambda: _household(consumer_reference))
    return HistoryResponse(household=_summary(g), history=[
        HistoryPoint(month=str(r.billing_month), units_consumed=float(r.units_consumed)) for r in g.itertuples()])


@router.get("/model-metrics", response_model=MetricsResponse)
def model_metrics():
    def load():
        meta = _metadata()
        mp = MODEL_PATH / "model_metrics.json"
        if not mp.exists():
            raise DemoDataError("Model metrics not found. Run: python train_prediction_model.py")
        return meta, json.loads(mp.read_text())
    meta, metrics = _guard(load)
    return MetricsResponse(
        model_name=meta["model_name"], model_version=meta["model_version"], dataset_type=meta["dataset_type"],
        dataset=meta["dataset"], training_period=meta["training_period"],
        evaluation_period=meta["evaluation_period"], metrics=metrics, model_card=meta["model_card"],
        metric_explanations={
            "mae": "Average absolute difference between predicted and actual consumption (kWh).",
            "rmse": "Like MAE but gives greater weight to larger errors (kWh).",
            "r2": "How much variation in the evaluation data the model explains (1.0 = all of it)."})


@router.get("/demo/forecast/{consumer_reference}", response_model=ForecastResponse)
def demo_forecast(consumer_reference: str, horizon: int = Query(1)):
    if horizon not in ALLOWED_HORIZONS:
        raise HTTPException(422, f"horizon must be one of {list(ALLOWED_HORIZONS)}")

    def run():
        g = _household(consumer_reference)
        model, meta = _model(), _metadata()
        if len(g) < MIN_HISTORY:
            raise HTTPException(422, "Not enough history for this household")
        fc = recursive_forecast(model, g["units_consumed"].tolist(), int(g["household_size"].iloc[0]),
                                str(g["billing_month"].iloc[-1]), horizon)
        return ForecastResponse(
            consumer_reference=consumer_reference, horizon=horizon,
            last_observed_month=str(g["billing_month"].iloc[-1]),
            forecast=[ForecastPoint(**f) for f in fc],
            total_predicted_kwh=round(sum(f["predicted_kwh"] for f in fc), 2),
            model_version=meta["model_version"])
    return _guard(run)
