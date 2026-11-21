import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import demo_predictions as dp
from generate_dataset import CSV_NAME, build_dataset, generate
from prediction_features import FEATURE_COLUMNS, build_feature_row, build_training_frame, recursive_forecast
from train_prediction_model import train


@pytest.fixture(scope="module")
def env(tmp_path_factory):
    root = tmp_path_factory.mktemp("demo")
    data, models = root / "data", root / "models"
    generate(data)
    result = train(data, models)
    return data, models, result


@pytest.fixture()
def client(env, monkeypatch):
    data, models, _ = env
    monkeypatch.setattr(dp, "DATA_PATH", data / CSV_NAME)
    monkeypatch.setattr(dp, "MODEL_PATH", models)
    dp.clear_cache()
    app = FastAPI()
    app.include_router(dp.router)
    return TestClient(app)


# ---- dataset
def test_dataset_shape_and_quality():
    df = build_dataset()
    assert len(df) == 1800 and df["consumer_reference"].nunique() == 50
    assert not df.duplicated(["consumer_reference", "billing_month"]).any()
    assert df["units_consumed"].min() > 0 and not df.isna().any().any()
    assert df["billing_month"].min() == "2023-01" and df["billing_month"].max() == "2025-12"


def test_dataset_reproducible_and_seed_sensitive():
    assert build_dataset(42).equals(build_dataset(42))
    assert not build_dataset(42).equals(build_dataset(7))


def test_regeneration_does_not_append(tmp_path):
    generate(tmp_path); generate(tmp_path)
    assert len(pd.read_csv(tmp_path / CSV_NAME)) == 1800


# ---- features
def test_features_use_past_only():
    hist = [100, 110, 120, 130, 140, 150]
    a = build_feature_row(hist, 4, 7)
    assert a["lag_1"] == 150 and a["roll_mean_3"] == 140
    with pytest.raises(ValueError):
        build_feature_row(hist[:5], 4, 7)


def test_no_future_leakage_in_training_frame():
    df = build_dataset()
    base = build_training_frame(df)
    df2 = df.copy()
    last = df2["billing_month"] == "2025-12"
    df2.loc[last, "units_consumed"] *= 5  # change only the final month
    changed = build_training_frame(df2)
    early = base["billing_month"] < "2025-12"
    pd.testing.assert_frame_equal(base[early][FEATURE_COLUMNS], changed[early][FEATURE_COLUMNS])


# ---- training / forecasting
def test_metrics_real_and_chronological(env):
    _, models, res = env
    m = res["metrics"]["one_step_ahead"]
    assert m["mae"] > 0 and m["rmse"] >= m["mae"] and m["r2"] <= 1
    md = res["metadata"]
    assert md["training_period"]["end"] < md["evaluation_period"]["start"]
    assert (models / "consumption_model.joblib").exists()


@pytest.mark.parametrize("h", [1, 3, 6])
def test_forecast_horizons(client, h):
    r = client.get(f"/api/predictions/demo/forecast/DEMO-1001?horizon={h}")
    assert r.status_code == 200
    body = r.json()
    assert len(body["forecast"]) == h and body["dataset_type"] == "synthetic_demo"
    assert all(p["predicted_kwh"] >= 0 for p in body["forecast"])
    assert body["forecast"][0]["month"] == "2026-01"


def test_recursive_forecast_non_negative():
    class Neg:
        def predict(self, X): return [-50.0]
    assert all(f["predicted_kwh"] == 0 for f in recursive_forecast(Neg(), [100] * 6, 3, "2025-12", 3))


# ---- API
def test_households_history_metrics(client):
    hs = client.get("/api/predictions/demo/households").json()
    assert len(hs) == 50
    h = client.get("/api/predictions/demo/history/DEMO-1002").json()
    assert len(h["history"]) == 36
    m = client.get("/api/predictions/model-metrics").json()
    assert m["metrics"]["one_step_ahead"]["mae"] > 0 and "synthetic" in m["disclaimer"]


def test_invalid_inputs(client):
    assert client.get("/api/predictions/demo/forecast/DEMO-9999?horizon=1").status_code == 404
    assert client.get("/api/predictions/demo/history/NOPE").status_code == 404
    assert client.get("/api/predictions/demo/forecast/DEMO-1001?horizon=2").status_code == 422
    assert client.get("/api/predictions/demo/forecast/DEMO-1001?horizon=abc").status_code == 422


def test_missing_artifacts_return_503(tmp_path, monkeypatch):
    monkeypatch.setattr(dp, "DATA_PATH", tmp_path / "none.csv")
    monkeypatch.setattr(dp, "MODEL_PATH", tmp_path)
    dp.clear_cache()
    app = FastAPI(); app.include_router(dp.router)
    c = TestClient(app)
    assert c.get("/api/predictions/demo/households").status_code == 503
    assert c.get("/api/predictions/model-metrics").status_code == 503
    assert c.get("/api/predictions/demo/forecast/DEMO-1001?horizon=1").status_code == 503


def test_corrupted_model_rejected(env, tmp_path, monkeypatch):
    data, models, _ = env
    import shutil
    bad = tmp_path / "m"; shutil.copytree(models, bad)
    (bad / "consumption_model.joblib").write_bytes(b"tampered")
    monkeypatch.setattr(dp, "DATA_PATH", data / CSV_NAME)
    monkeypatch.setattr(dp, "MODEL_PATH", bad)
    dp.clear_cache()
    app = FastAPI(); app.include_router(dp.router)
    assert TestClient(app).get("/api/predictions/demo/forecast/DEMO-1001?horizon=1").status_code == 503
