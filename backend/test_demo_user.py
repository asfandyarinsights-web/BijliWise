"""Demo User API tests. No MySQL needed: the demo API must not touch the database at all."""
import pytest
from fastapi.testclient import TestClient

import demo_predictions as dp
import main
import notifications


@pytest.fixture()
def client(monkeypatch):
    dp.clear_cache()

    def no_db(*a, **k):
        raise AssertionError("Demo endpoints must never open a database connection")

    # Any DB access from the demo API would blow up the test.
    monkeypatch.setattr(main, "get_connection", no_db)
    monkeypatch.setattr(notifications, "get_connection", no_db)
    yield TestClient(main.app)
    dp.clear_cache()


def test_profile_is_labelled_fictional(client):
    body = client.get("/api/demo/profile").json()
    assert body["is_demo"] is True and body["consumer_reference"] == "DEMO-1001"
    assert "DEMO DATA" in body["disclaimer"] and body["months"] == 36


def test_demo_bills_shape_and_separation(client):
    body = client.get("/api/demo/bills").json()
    bills = body["bills"]
    assert body["total"] == 36 == len(bills)
    assert all(b["is_demo"] and b["consumer_reference"] == "DEMO-1001" for b in bills)
    assert all(b["id"] >= 900000 for b in bills)  # cannot collide with real auto-increment ids
    assert bills[0]["billing_month"] > bills[-1]["billing_month"]  # newest first
    assert {"id", "billing_month", "units_consumed", "total_amount", "issue_date", "due_date", "payment_status"} <= set(bills[0])


def test_demo_data_is_deterministic(client):
    assert client.get("/api/demo/bills").json() == client.get("/api/demo/bills").json()
    assert client.get("/api/demo/notifications").json() == client.get("/api/demo/notifications").json()


def test_demo_analytics_and_insights(client):
    a = client.get("/api/demo/analytics/monthly").json()
    assert a["total_months"] == 36 and a["analytics"][0]["month"] < a["analytics"][-1]["month"]
    i = client.get("/api/demo/insights/energy").json()
    assert i["success"] is True and i["is_demo"] is True


def test_demo_notifications_are_computed_not_stored(client):
    n = client.get("/api/demo/notifications").json()
    assert n["is_demo"] is True and n["unread_count"] == len(n["notifications"]) >= 3
    assert {x["category"] for x in n["notifications"]} <= set(notifications.CATEGORIES)
    assert any(x["title"] == "You are in Demo Mode" for x in n["notifications"])


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
@pytest.mark.parametrize("path", ["/api/demo/bills", "/api/demo/bills/900001", "/api/demo/notifications", "/api/demo/profile"])
def test_demo_api_is_read_only(client, method, path):
    assert getattr(client, method)(path).status_code in (404, 405)


def test_missing_dataset_returns_503(client, monkeypatch, tmp_path):
    monkeypatch.setattr(dp, "DATA_PATH", tmp_path / "missing.csv")
    dp.clear_cache()
    assert client.get("/api/demo/bills").status_code == 503
