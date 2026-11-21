"""Tests for predictions.py. Uses isolated test data only; nothing here touches the real database."""
import json, os, sys
from datetime import date
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import predictions as p


def row(ref, year, month, units=200, amount=6800):
    return {"consumer_reference": ref, "billing_month": date(year, month, 1),
            "units_consumed": Decimal(str(units)), "total_amount": Decimal(str(amount))}

def months(ref, count, start=(2025, 1)):
    y, m = start
    out = []
    for i in range(count):
        out.append(row(ref, y + (m - 1 + i) // 12, (m - 1 + i) % 12 + 1, 200 + i))
    return out

class GoodModel:  # test-only stand-in; proves the "ready" path only runs for a validated model
    validated = True
    metrics = {"name": "MAPE", "value": 8.4, "unit": "%"}
    def predict(self, history, horizon):
        last = history[-1]["month"]; y, m = int(last[:4]), int(last[5:])
        out = []
        for i in range(1, horizon + 1):
            yy, mm = y + (m - 1 + i) // 12, (m - 1 + i) % 12 + 1
            out.append({"month": f"{yy:04d}-{mm:02d}", "consumption_kwh": 210.0, "lower_kwh": 190.0, "upper_kwh": 230.0})
        return out

class UnvalidatedModel(GoodModel): validated = False
class ShortModel(GoodModel):
    def predict(self, history, horizon): return super().predict(history, horizon)[:-1]
class PastMonthModel(GoodModel):
    def predict(self, history, horizon): return [{"month": history[-1]["month"], "consumption_kwh": 1.0}] * horizon
class CrashModel(GoodModel):
    def predict(self, history, horizon): raise RuntimeError("boom")
class BadIntervalModel(GoodModel):
    def predict(self, history, horizon):
        pts = super().predict(history, horizon)
        for pt in pts: pt["lower_kwh"], pt["upper_kwh"] = 300.0, 100.0
        return pts

# 1. household listing; none, and the brief's snapshot (two households, one bill each)
assert p.summarize_households([]) == {"households": [], "skipped_records": 0}
r = p.summarize_households([row("B-2", 2026, 11, 190, 6200), row("A-1", 2026, 10, 250, 8500), {"consumer_reference": "  "}])
assert [h["consumer_reference"] for h in r["households"]] == ["A-1", "B-2"] and r["skipped_records"] == 1
assert all(h["observations"] == 1 and not h["meets_data_requirement"] for h in r["households"])

# 2. one bill -> insufficient, no predictions, no average
f = p.build_forecast("A-1", [row("A-1", 2026, 10, 250, 8500)], 3)
assert f["available"] is False and f["status"] == "insufficient_data" and f["predictions"] is None
assert f["observations_available"] == 1 and f["observations_required"] == 12 and f["forecast_horizon"] == 3
assert f["bill_forecast"]["available"] is False
assert p.build_readiness("A-1", [row("A-1", 2026, 10)])["avg_consumption"] is None

# 3. unknown household -> None (endpoint turns this into 404)
assert p.build_readiness("NOPE", [row("A-1", 2026, 10)]) is None and p.build_forecast("NOPE", [], 1) is None

# 4. two households with 6 bills each: combined 12 must NOT make either one ready
rows = months("A", 6) + months("B", 6)
assert p.build_readiness("A", rows)["status"] == "insufficient_data"
assert p.build_readiness("A", rows)["observations_available"] == 6

# 5. 12 bills, no model -> model_not_trained (never model_ready), still no predictions
rd = p.build_readiness("A", months("A", 12))
assert rd["status"] == "model_not_trained" and rd["forecast_available"] is False and rd["model"]["trained"] is False
assert p.build_forecast("A", months("A", 12), 1)["predictions"] is None
assert p.build_readiness("A", months("A", 11))["status"] == "insufficient_data"   # boundary

# 6. chronological order from shuffled input, month span and gaps
shuffled = [row("A", 2026, 3), row("A", 2025, 11), row("A", 2026, 1)]
rd = p.build_readiness("A", shuffled)
assert [h["month"] for h in rd["history"]] == ["2025-11", "2026-01", "2026-03"]
assert rd["first_month"] == "2025-11" and rd["last_month"] == "2026-03" and rd["span_months"] == 5 and rd["missing_months"] == 2

# 7. invalid rows are counted and excluded
bad = [row("A", 2026, 1), {"consumer_reference": "A", "billing_month": None, "units_consumed": 1, "total_amount": 1},
       {"consumer_reference": "A", "billing_month": date(2026, 2, 1), "units_consumed": "abc", "total_amount": 1},
       {"consumer_reference": "A", "billing_month": date(2026, 3, 1), "units_consumed": -4, "total_amount": 1}]
rd = p.build_readiness("A", bad)
assert rd["observations_available"] == 1 and rd["invalid_records"] == 3

# 8. duplicate months: identical -> counted once; conflicting -> excluded and reported
rd = p.build_readiness("A", [row("A", 2026, 1), row("A", 2026, 1), row("A", 2026, 2, 100), row("A", 2026, 2, 999)])
assert rd["observations_available"] == 1 and rd["conflicting_months"] == ["2026-02"]

# 9. household matching is exact: "A" does not pick up "A-1" or "a"
rows = [row("A", 2026, 1), row("A-1", 2026, 2), row("a", 2026, 3)]
assert p.build_readiness("A", rows)["observations_available"] == 1

# 10. horizon validation
assert [p.is_valid_horizon(h) for h in (1, 3, 6)] == [True] * 3
assert not any(p.is_valid_horizon(h) for h in (0, 2, 12, -1, "3", None, True, 3.0))

# 11. an artifact file with no loader -> forecast_unavailable, never ready
os.makedirs(p.MODEL_DIR, exist_ok=True); open(p.MODEL_ARTIFACT, "w").close()
try:
    assert p.build_readiness("A", months("A", 12))["status"] == "forecast_unavailable"
finally:
    os.remove(p.MODEL_ARTIFACT)
    if not os.listdir(p.MODEL_DIR): os.rmdir(p.MODEL_DIR)

# 12. model hook: only a validated model with a well-formed forecast produces predictions
rows12 = months("A", 12)
ok = p.build_forecast("A", rows12, 3, GoodModel())
assert ok["available"] and ok["status"] == "model_ready" and len(ok["predictions"]) == 3
assert ok["predictions"][0]["month"] == "2026-01" and ok["model"]["metrics"] == {"name": "MAPE", "value": 8.4, "unit": "%"}
assert ok["bill_forecast"]["available"] is False            # bills stay unavailable even with a model
assert p.build_forecast("A", rows12, 1, UnvalidatedModel())["status"] == "forecast_unavailable"
for bad_model in (ShortModel(), PastMonthModel(), CrashModel()):
    out = p.build_forecast("A", rows12, 3, bad_model)
    assert out["available"] is False and out["predictions"] is None and out["status"] == "forecast_unavailable"
bi = p.build_forecast("A", rows12, 1, BadIntervalModel())
assert bi["available"] and bi["predictions"][0]["lower_kwh"] is None   # inconsistent interval is dropped
assert p.build_forecast("A", months("A", 5), 1, GoodModel())["status"] == "insufficient_data"  # model can't bypass data rule

# 13. JSON-safe
json.dumps(ok); json.dumps(p.build_forecast("A", rows12, 1))
print("ALL PREDICTION BACKEND CHECKS PASSED")
