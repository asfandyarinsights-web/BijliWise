"""Read-only Demo User API.

Everything under /api/demo is built from the synthetic dataset (a fictional household) and
NEVER reads or writes MySQL. There are no write routes here, so any POST/PUT/PATCH/DELETE to
/api/demo/... is rejected by FastAPI (405). Real data lives only under the other /api routes.
"""
from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, HTTPException

import demo_predictions as dp
from insights import UNUSUAL_THRESHOLD, build_energy_insights

router = APIRouter(prefix="/api/demo", tags=["demo-user"])

DEMO_REFERENCE = "DEMO-1001"
DEMO_NAME = "Demo User"
DISCLAIMER = ("DEMO DATA: this is a fictional household created for the BijliWise project. "
              "These are not real meter readings, bills or tariffs.")
BILL_ID_BASE = 900000
SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def estimate_bill(kwh: float) -> int:
    """Illustrative slab tariff (PKR) + fixed charge + 18% taxes. Same idea as the frontend sample data."""
    left, total = float(kwh), 0.0
    for size, rate in ((100, 22), (100, 30), (200, 38), (float("inf"), 50)):
        used = min(left, size)
        total += used * rate
        left -= used
        if left <= 0:
            break
    return round((total + 250) * 1.18)


def _household_rows():
    try:
        df = dp._dataset()
    except dp.DemoDataError as error:
        raise HTTPException(status_code=503, detail=str(error))
    g = df[df["consumer_reference"] == DEMO_REFERENCE]
    if g.empty:
        raise HTTPException(status_code=503, detail="Demo household is missing from the synthetic dataset.")
    return g


def _bills_ascending() -> List[dict]:
    g = _household_rows()
    rows = list(g.itertuples())
    bills = []
    for i, r in enumerate(rows):
        year, month = int(r.billing_month[:4]), int(r.billing_month[5:7])
        first = date(year, month, 1)
        issue = date(year + (month == 12), month % 12 + 1, 5)  # issued on the 5th of the next month
        bills.append({
            "id": BILL_ID_BASE + i + 1,
            "consumer_reference": DEMO_REFERENCE,
            "billing_month": first.isoformat(),
            "units_consumed": float(r.units_consumed),
            "total_amount": float(estimate_bill(r.units_consumed)),
            "issue_date": issue.isoformat(),
            "due_date": (issue + timedelta(days=14)).isoformat(),
            "payment_status": "Unpaid" if i == len(rows) - 1 else "Paid",
            "created_at": f"{issue.isoformat()}T00:00:00",
            "is_demo": True,
        })
    return bills


@router.get("/profile")
def demo_profile():
    g = _household_rows()
    last = g.iloc[-1]
    return {
        "success": True, "is_demo": True, "name": DEMO_NAME, "consumer_reference": DEMO_REFERENCE,
        "city": str(last["city"]), "household_size": int(last["household_size"]),
        "usage_profile": str(last.get("usage_profile", "typical")),
        "months": int(len(g)), "first_month": str(g.iloc[0]["billing_month"]),
        "last_month": str(last["billing_month"]), "disclaimer": DISCLAIMER,
    }


@router.get("/bills")
def demo_bills():
    bills = list(reversed(_bills_ascending()))  # newest first, like /api/bills
    return {"success": True, "is_demo": True, "total": len(bills), "bills": bills}


@router.get("/analytics/monthly")
def demo_monthly_analytics():
    analytics = [{"month": b["billing_month"][:7], "total_units": b["units_consumed"],
                  "total_expense": b["total_amount"], "total_bills": 1} for b in _bills_ascending()]
    return {"success": True, "is_demo": True, "total_months": len(analytics), "analytics": analytics}


@router.get("/insights/energy")
def demo_energy_insights():
    rows = [{"consumer_reference": b["consumer_reference"], "billing_month": b["billing_month"],
             "units_consumed": b["units_consumed"], "total_amount": b["total_amount"],
             "payment_status": b["payment_status"]} for b in _bills_ascending()]
    # Same rule-based logic as the real Energy Insights. No AI-written text.
    return {"success": True, "is_demo": True, **build_energy_insights(rows)}


@router.get("/notifications")
def demo_notifications():
    """Computed on the fly from demo data, never stored, so it can never mix with real notifications."""
    bills = _bills_ascending()
    last = bills[-1]
    stamp = f"{last['issue_date']}T09:00:00"
    items = [{
        "id": 1, "category": "Bill", "title": "Latest demo bill ready", "action_path": "bills",
        "message": f"Demo bill for {last['billing_month'][:7]} ({last['units_consumed']:.0f} kWh) is ready to review.",
    }]
    earlier = [b["units_consumed"] for b in bills[-4:-1]]
    if len(earlier) == 3:
        baseline = sum(earlier) / 3
        change = (last["units_consumed"] - baseline) / baseline
        if abs(change) > UNUSUAL_THRESHOLD:
            way = "above" if change > 0 else "below"
            items.append({"id": 2, "category": "Energy", "title": f"Demo usage {way} the usual level",
                          "action_path": "insights",
                          "message": f"The latest demo month is {abs(change) * 100:.0f}% {way} the average of the previous 3 demo bills."})
    items.append({"id": 3, "category": "Prediction", "title": "Synthetic forecast available",
                  "action_path": "predictions",
                  "message": "Open Predictions to generate a 1, 3 or 6 month forecast from the synthetic demo model."})
    items.append({"id": 4, "category": "System", "title": "You are in Demo Mode", "action_path": None,
                  "message": "Everything here is fictional and read-only. Nothing is saved and real records are untouched."})
    return {"success": True, "is_demo": True, "unread_count": len(items), "total": len(items),
            "notifications": [{**i, "consumer_reference": DEMO_REFERENCE, "is_read": False,
                               "related_entity_id": None, "created_at": stamp} for i in items]}
