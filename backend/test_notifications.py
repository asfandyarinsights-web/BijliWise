"""Notification tests against a REAL MySQL/MariaDB, but only in a separate *_test database.

These tests never touch your real `bijliwise_db`. They use the same host/user/password as your
.env, force DB_NAME=bijliwise_test, and are skipped if MySQL is not running.
"""
import os

import pymysql
import pytest
from fastapi.testclient import TestClient

TEST_DB = "bijliwise_test"


@pytest.fixture(scope="module")
def db_env():
    mp = pytest.MonkeyPatch()
    mp.setenv("DB_NAME", TEST_DB)
    import database  # noqa: F401  (loads .env; our DB_NAME above wins)
    try:
        server = pymysql.connect(host=os.getenv("DB_HOST", "localhost"), port=int(os.getenv("DB_PORT", "3306")),
                                 user=os.getenv("DB_USER", "root"), password=os.getenv("DB_PASSWORD", ""))
    except pymysql.err.OperationalError as error:
        mp.undo()
        pytest.skip(f"MySQL is not reachable, notification DB tests skipped: {error}")
    with server.cursor() as c:
        c.execute(f"CREATE DATABASE IF NOT EXISTS {TEST_DB} DEFAULT CHARSET utf8mb4")
    server.close()
    yield
    mp.undo()


@pytest.fixture()
def client(db_env):
    import main
    import notifications
    from create_tables import create_electricity_bills_table
    conn = main.get_connection()
    assert (conn.db.decode() if isinstance(conn.db, bytes) else conn.db).endswith("_test")  # safety guard
    with conn.cursor() as c:
        c.execute("DROP TABLE IF EXISTS notifications")
        c.execute("DROP TABLE IF EXISTS electricity_bills")
    conn.commit()
    conn.close()
    create_electricity_bills_table()
    return TestClient(main.app)


def _make(client, ref, title="T", category="Bill", key=None):
    import notifications
    import main
    conn = main.get_connection()
    try:
        notifications.ensure_table(conn)
        return notifications.create_notification(conn, title=title, message="m", category=category,
                                                 consumer_reference=ref, dedupe_key=key)
    finally:
        conn.close()


def _bill(ref, month, units, status="Paid"):
    return {"consumer_reference": ref, "billing_month": month, "units_consumed": units,
            "total_amount": units * 30, "payment_status": status}


def test_create_list_and_unread_count(client):
    a, b = _make(client, "H-A", "one"), _make(client, "H-A", "two", "Energy")
    body = client.get("/api/notifications").json()
    assert body["unread_count"] == 2 and [n["id"] for n in body["notifications"]] == [b, a]
    assert all(n["is_read"] is False and n["created_at"] for n in body["notifications"])
    assert client.get("/api/notifications/unread-count").json()["unread_count"] == 2


def test_mark_one_all_delete_and_clear(client):
    ids = [_make(client, "H-A", f"n{i}") for i in range(3)]
    assert client.patch(f"/api/notifications/{ids[0]}/read").status_code == 200
    assert client.get("/api/notifications/unread-count").json()["unread_count"] == 2
    assert client.patch("/api/notifications/read-all").json()["updated"] == 2
    assert client.get("/api/notifications/unread-count").json()["unread_count"] == 0
    assert client.delete(f"/api/notifications/{ids[1]}").status_code == 200
    assert client.get("/api/notifications").json()["total"] == 2
    assert client.delete("/api/notifications").json()["deleted"] == 2
    assert client.get("/api/notifications").json()["total"] == 0  # empty state


def test_invalid_and_missing_ids(client):
    for bad in ("0", "-5", "abc", "99999999999"):
        assert client.patch(f"/api/notifications/{bad}/read").status_code == 422
        assert client.delete(f"/api/notifications/{bad}").status_code == 422
    assert client.patch("/api/notifications/777/read").status_code == 404
    assert client.delete("/api/notifications/777").status_code == 404


def test_household_ownership_isolation(client):
    a, b = _make(client, "H-A", "mine"), _make(client, "H-B", "theirs")
    listed = client.get("/api/notifications", params={"consumer_reference": "H-A"}).json()
    assert [n["id"] for n in listed["notifications"]] == [a] and listed["unread_count"] == 1
    assert client.patch(f"/api/notifications/{b}/read", params={"consumer_reference": "H-A"}).status_code == 404
    assert client.delete(f"/api/notifications/{b}", params={"consumer_reference": "H-A"}).status_code == 404
    client.patch("/api/notifications/read-all", params={"consumer_reference": "H-A"})
    client.delete("/api/notifications", params={"consumer_reference": "H-A"})
    left = client.get("/api/notifications").json()
    assert [n["id"] for n in left["notifications"]] == [b] and left["notifications"][0]["is_read"] is False


def test_dedupe_key_prevents_duplicates(client):
    assert _make(client, "H-A", key="same") is not None
    assert _make(client, "H-A", key="same") is None
    assert client.get("/api/notifications").json()["total"] == 1


def test_saving_a_bill_creates_one_notification(client):
    r = client.post("/api/bills", json=_bill("H-A", "2025-01-01", 200))
    assert r.status_code == 201
    items = client.get("/api/notifications").json()["notifications"]
    assert [(n["category"], n["title"], n["related_entity_id"]) for n in items] == [("Bill", "Bill saved", r.json()["bill_id"])]
    assert items[0]["action_path"] == "bills"


def test_no_energy_alert_without_enough_history(client):
    for m, u in (("2025-01-01", 100), ("2025-02-01", 100)):
        client.post("/api/bills", json=_bill("H-A", m, u))
    client.post("/api/bills", json=_bill("H-A", "2025-03-01", 900))  # only 2 earlier bills
    assert {n["category"] for n in client.get("/api/notifications").json()["notifications"]} == {"Bill"}


def test_energy_alert_for_large_change_only_once(client):
    for m in ("2025-01-01", "2025-02-01", "2025-03-01"):
        client.post("/api/bills", json=_bill("H-A", m, 100))
    client.post("/api/bills", json=_bill("H-A", "2025-04-01", 140))  # +40% -> alert
    client.post("/api/bills", json=_bill("H-A", "2025-05-01", 150))  # +45% vs (100,100,140)? still checked per month
    energy = [n for n in client.get("/api/notifications").json()["notifications"] if n["category"] == "Energy"]
    assert len(energy) >= 1 and all("above" in n["message"] for n in energy)
    assert sum("2025-04" in n["message"] or "Apr 2025" in n["message"] for n in energy) == 1


def test_small_change_and_backfill_do_not_alert(client):
    for m in ("2025-01-01", "2025-02-01", "2025-03-01"):
        client.post("/api/bills", json=_bill("H-A", m, 100))
    client.post("/api/bills", json=_bill("H-A", "2025-04-01", 110))   # +10%: no alert
    client.post("/api/bills", json=_bill("H-A", "2024-12-01", 999))   # older month: no alert
    assert not [n for n in client.get("/api/notifications").json()["notifications"] if n["category"] == "Energy"]


def test_overdue_update_notifies_once(client):
    bill_id = client.post("/api/bills", json=_bill("H-A", "2025-01-01", 100, "Unpaid")).json()["bill_id"]
    for _ in range(2):
        assert client.put(f"/api/bills/{bill_id}", json=_bill("H-A", "2025-01-01", 100, "Overdue")).status_code == 200
    titles = [n["title"] for n in client.get("/api/notifications").json()["notifications"]]
    assert titles.count("Bill marked overdue") == 1


def test_notification_failure_never_breaks_saving_a_bill(client, monkeypatch):
    import notifications
    monkeypatch.setattr(notifications, "ensure_table", lambda c: (_ for _ in ()).throw(RuntimeError("boom")))
    assert client.post("/api/bills", json=_bill("H-A", "2025-01-01", 100)).status_code == 201


def test_demo_data_never_enters_real_notifications(client):
    client.get("/api/demo/notifications")
    client.get("/api/demo/bills")
    assert client.get("/api/notifications").json()["total"] == 0
    assert client.get("/api/bills").json()["total"] == 0
