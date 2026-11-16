import json, sys
from datetime import date
from decimal import Decimal
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from insights import build_energy_insights as b

def row(ref, m, u, a, s="Unpaid"):
    return {"consumer_reference": ref, "billing_month": date(2026, m, 1),
            "units_consumed": Decimal(str(u)), "total_amount": Decimal(str(a)), "payment_status": s}

def show(name, r, keys=("overview","data_quality")):
    print("=====", name)
    for k in keys: print(k, json.dumps(r[k], default=str)[:400])
    for i in r["insights"]: print(f"  [{i['category']}/{i['status']}] {i['title']}: {i['message']}")

# 1. empty
r = b([]); show("empty", r)
assert r["overview"]["total_bills"] == 0 and r["monthly_analysis"] == [] and r["usage_patterns"]["highest_bill"] is None

# 2. snapshot from the brief: two households, one bill each (test data only)
r = b([row("A-1", 10, 250, 8500), row("B-2", 11, 190, 6200)]); show("snapshot", r)
assert r["overview"] == {"total_consumption": 440.0, "total_expense": 14700.0, "total_bills": 2, "household_count": 2, "month_count": 2}
assert r["data_quality"]["sufficient_for_household_trends"] is False
assert r["data_quality"]["monthly_totals_comparable"] is False
assert all(h["latest_change"] is None and h["avg_units_per_bill"] is None for h in r["household_analysis"])
ids = [i["id"] for i in r["insights"]]
assert "no_household_trend" in ids and "months_not_comparable" in ids
assert not any(i["id"].startswith(("change_", "unusual_")) for i in r["insights"])

# 3. single bill
r = b([row("A-1", 10, 250, 8500, "Paid")]); show("single", r)
assert r["usage_patterns"]["highest_consumption"] is None and r["usage_patterns"]["avg_units_per_bill"] is None

# 4. one household, 5 bills, last is +40% above earlier avg; one overdue
rows = [row("A-1", m, u, u*34, "Paid") for m, u in [(1,200),(2,210),(3,190),(4,200)]] + [row("A-1", 5, 280, 9520, "Overdue")]
r = b(rows); show("history", r, ("data_quality","usage_patterns"))
assert r["data_quality"]["monthly_totals_comparable"] is True
assert r["data_quality"]["sufficient_for_unusual_check"] is True
assert len(r["usage_patterns"]["unusual_bills"]) == 1 and r["usage_patterns"]["unusual_bills"][0]["pct_above"] == 40.0
assert r["household_analysis"][0]["latest_change"]["units_pct"] == 40.0
assert r["usage_patterns"]["outstanding_count"] == 1

# 5. within threshold -> no unusual
rows = [row("A-1", m, u, u*30, "Paid") for m, u in [(1,200),(2,200),(3,200),(4,230)]]
r = b(rows); assert r["usage_patterns"]["unusual_bills"] == [] and any(i["id"] == "no_unusual" for i in r["insights"])

# 6. zero baseline -> no division by zero, no percent
r = b([row("A-1", 1, 0, 0), row("A-1", 2, 100, 3000)]); show("zero baseline", r, ("household_analysis",))
assert r["household_analysis"][0]["latest_change"]["units_pct"] is None
assert r["usage_patterns"]["avg_cost_per_kwh"] == 30.0
# all-zero units -> cost per kWh must be None
assert b([row("A-1", 1, 0, 0)])["usage_patterns"]["avg_cost_per_kwh"] is None

# 7. invalid rows are skipped and counted, strings/None handled
bad = [{"consumer_reference": "", "billing_month": date(2026,1,1), "units_consumed": 1, "total_amount": 1},
       {"consumer_reference": "X", "billing_month": None, "units_consumed": 1, "total_amount": 1},
       {"consumer_reference": "X", "billing_month": "2026-03-01", "units_consumed": "abc", "total_amount": 1},
       {"consumer_reference": "X", "billing_month": "2026-03-01", "units_consumed": -5, "total_amount": 1},
       "junk", None,
       {"consumer_reference": "X", "billing_month": "2026-03-01", "units_consumed": "120.5", "total_amount": 4000, "payment_status": None}]
r = b(bad); assert r["data_quality"]["skipped_records"] == 6 and r["overview"]["total_bills"] == 1
assert r["usage_patterns"]["payment_summary"]["Unknown"]["count"] == 1

# 8. two households, same months -> comparable monthly totals, per-household changes
rows = [row("A", 1, 100, 3000, "Paid"), row("A", 2, 120, 3600, "Paid"), row("B", 1, 300, 9000, "Paid"), row("B", 2, 270, 8100, "Paid")]
r = b(rows); show("two households", r, ("data_quality",))
assert r["data_quality"]["monthly_totals_comparable"] is True
assert r["monthly_analysis"][0] == {"month": "2026-01", "total_units": 400.0, "total_expense": 12000.0, "total_bills": 2, "household_count": 2}
json.dumps(r)  # serialisable
print("\nALL BACKEND CHECKS PASSED")
