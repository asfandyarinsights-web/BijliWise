"""Rule-based Energy Insights for BijliWise.

Everything here is plain, explainable arithmetic on the saved electricity bills.
There is no machine learning, no forecasting and no invented tariff.

The module has no database or web code, so it can be tested with plain Python lists.
"""

import math
from collections import defaultdict
from datetime import date, datetime, timezone

# A household's latest bill is called "above its usual level" only when it is more than 25%
# above the average of that same household's earlier bills. Same fixed rule as the Analytics page.
UNUSUAL_THRESHOLD = 0.25
MIN_BILLS_FOR_TREND = 2          # a trend compares a household with itself: needs two bills
MIN_BILLS_FOR_UNUSUAL_CHECK = 4  # the latest bill plus at least 3 earlier bills as a baseline
MAX_HOUSEHOLD_CHANGE_INSIGHTS = 5

SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
KNOWN_STATUSES = ("Paid", "Unpaid", "Overdue")


# ---------- small, safe helpers ----------

def _to_float(value):
    """Finite number >= 0 from an int, float, Decimal or numeric string. Otherwise None."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) and number >= 0 else None


def _month_key(value):
    """'YYYY-MM' from a date, datetime or 'YYYY-MM...' string. Otherwise None."""
    if isinstance(value, (date, datetime)):
        return f"{value.year:04d}-{value.month:02d}"
    if isinstance(value, str) and len(value) >= 7:
        try:
            parsed = datetime.strptime(value[:7], "%Y-%m")
        except ValueError:
            return None
        return f"{parsed.year:04d}-{parsed.month:02d}"
    return None


def _label(month_key):
    year, month = month_key.split("-")
    return f"{SHORT_MONTHS[int(month) - 1]} {year}"


def _round(value):
    return round(value, 2)


def _pct(baseline, value):
    """Percent change from baseline to value, or None when the baseline is zero."""
    if baseline <= 0:
        return None
    return round((value - baseline) / baseline * 100, 1)


def _num(value):
    text = f"{value:,.2f}".rstrip("0").rstrip(".")
    return text


def _kwh(value):
    return f"{_num(value)} kWh"


def _pkr(value):
    return f"PKR {value:,.0f}"


def _plural(count, word):
    return f"{count} {word}{'' if count == 1 else 's'}"


def _clean(rows):
    """Valid bills sorted by month then reference, plus how many rows had to be skipped."""
    bills, skipped = [], 0
    for row in rows or []:
        if not isinstance(row, dict):
            skipped += 1
            continue
        reference = row.get("consumer_reference")
        reference = reference.strip() if isinstance(reference, str) else ""
        month = _month_key(row.get("billing_month"))
        units = _to_float(row.get("units_consumed"))
        amount = _to_float(row.get("total_amount"))
        if not reference or month is None or units is None or amount is None:
            skipped += 1
            continue
        status = row.get("payment_status")
        status = status.strip().title() if isinstance(status, str) else ""
        bills.append({
            "ref": reference,
            "month": month,
            "units": units,
            "amount": amount,
            "status": status if status in KNOWN_STATUSES else "Unknown",
        })
    bills.sort(key=lambda b: (b["month"], b["ref"]))
    return bills, skipped


def _bill_view(bill):
    return {
        "consumer_reference": bill["ref"],
        "month": bill["month"],
        "units": _round(bill["units"]),
        "amount": _round(bill["amount"]),
    }


# ---------- the analysis ----------

def build_energy_insights(rows):
    bills, skipped = _clean(rows)

    total_bills = len(bills)
    total_units = sum(b["units"] for b in bills)
    total_expense = sum(b["amount"] for b in bills)

    by_month, by_household = defaultdict(list), defaultdict(list)
    for bill in bills:
        by_month[bill["month"]].append(bill)
        by_household[bill["ref"]].append(bill)

    month_keys = sorted(by_month)
    household_refs = sorted(by_household)

    # --- monthly totals (same shape and meaning as /api/analytics/monthly) ---
    monthly_analysis = [
        {
            "month": key,
            "total_units": _round(sum(b["units"] for b in by_month[key])),
            "total_expense": _round(sum(b["amount"] for b in by_month[key])),
            "total_bills": len(by_month[key]),
            "household_count": len({b["ref"] for b in by_month[key]}),
        }
        for key in month_keys
    ]

    # Month-to-month differences only describe ONE household when every month contains
    # bills from exactly the same households.
    reference_sets = [frozenset(b["ref"] for b in by_month[key]) for key in month_keys]
    monthly_totals_comparable = len(month_keys) >= 2 and len(set(reference_sets)) == 1

    # --- per household ---
    household_analysis = []
    for ref in household_refs:
        own = by_household[ref]  # already sorted by month
        count = len(own)
        units = sum(b["units"] for b in own)
        expense = sum(b["amount"] for b in own)

        latest_change = None
        if count >= MIN_BILLS_FOR_TREND and own[-2]["month"] != own[-1]["month"]:
            before, last = own[-2], own[-1]
            latest_change = {
                "from_month": before["month"],
                "to_month": last["month"],
                "units_diff": _round(last["units"] - before["units"]),
                "units_pct": _pct(before["units"], last["units"]),
                "expense_diff": _round(last["amount"] - before["amount"]),
                "expense_pct": _pct(before["amount"], last["amount"]),
            }

        household_analysis.append({
            "consumer_reference": ref,
            "bill_count": count,
            "total_units": _round(units),
            "total_expense": _round(expense),
            # An average of a single bill is just that bill, so it is only given for 2+ bills.
            "avg_units_per_bill": _round(units / count) if count >= 2 else None,
            "avg_expense_per_bill": _round(expense / count) if count >= 2 else None,
            "first_month": own[0]["month"],
            "last_month": own[-1]["month"],
            "latest_change": latest_change,
        })

    households_with_history = sum(1 for h in household_analysis if h["bill_count"] >= MIN_BILLS_FOR_TREND)

    # --- unusual bills: latest bill vs the same household's earlier bills ---
    unusual_bills = []
    unusual_check_possible = False
    for ref in household_refs:
        own = by_household[ref]
        if len(own) < MIN_BILLS_FOR_UNUSUAL_CHECK:
            continue
        unusual_check_possible = True
        last, earlier = own[-1], own[:-1]
        baseline = sum(b["units"] for b in earlier) / len(earlier)
        if baseline > 0 and last["units"] > baseline * (1 + UNUSUAL_THRESHOLD):
            unusual_bills.append({
                "consumer_reference": ref,
                "month": last["month"],
                "units": _round(last["units"]),
                "baseline_units": _round(baseline),
                "earlier_bills": len(earlier),
                "pct_above": _pct(baseline, last["units"]),
            })

    # --- payment status (counts what the database says, nothing more) ---
    payment_summary = {status: {"count": 0, "amount": 0.0} for status in KNOWN_STATUSES}
    for bill in bills:
        slot = payment_summary.setdefault(bill["status"], {"count": 0, "amount": 0.0})
        slot["count"] += 1
        slot["amount"] += bill["amount"]
    payment_summary = {k: {"count": v["count"], "amount": _round(v["amount"])} for k, v in payment_summary.items()}
    outstanding_count = payment_summary["Unpaid"]["count"] + payment_summary["Overdue"]["count"]
    outstanding_amount = _round(payment_summary["Unpaid"]["amount"] + payment_summary["Overdue"]["amount"])

    # --- bill-level patterns (needs at least 2 bills to be meaningful) ---
    enough_for_comparison = total_bills >= 2
    usage_patterns = {
        "highest_consumption": _bill_view(max(bills, key=lambda b: b["units"])) if enough_for_comparison else None,
        "lowest_consumption": _bill_view(min(bills, key=lambda b: b["units"])) if enough_for_comparison else None,
        "highest_bill": _bill_view(max(bills, key=lambda b: b["amount"])) if total_bills else None,
        "lowest_bill": _bill_view(min(bills, key=lambda b: b["amount"])) if enough_for_comparison else None,
        "avg_units_per_bill": _round(total_units / total_bills) if enough_for_comparison else None,
        "avg_expense_per_bill": _round(total_expense / total_bills) if enough_for_comparison else None,
        # Actual money paid divided by actual units billed. Not a tariff estimate.
        "avg_cost_per_kwh": _round(total_expense / total_units) if total_units > 0 else None,
        "payment_summary": payment_summary,
        "outstanding_count": outstanding_count,
        "outstanding_amount": outstanding_amount,
        "unusual_bills": unusual_bills,
    }

    # --- data quality: what can and cannot be concluded ---
    household_count = len(household_refs)
    if total_bills == 0:
        message = "No electricity bills are saved yet. Add bills to start seeing insights."
    elif households_with_history == 0:
        message = (
            "Household trend analysis needs at least 2 bills for the same household reference. "
            f"Right now {'the household has' if household_count == 1 else 'every household has'} only one saved bill."
        )
    else:
        message = (
            f"{households_with_history} of {_plural(household_count, 'household')} "
            f"{'has' if households_with_history == 1 else 'have'} 2 or more bills, "
            "so each can be compared with its own previous bill."
        )

    data_quality = {
        "has_data": total_bills > 0,
        "skipped_records": skipped,
        "month_count": len(month_keys),
        "households_with_history": households_with_history,
        "sufficient_for_household_trends": households_with_history > 0,
        "sufficient_for_unusual_check": unusual_check_possible,
        "monthly_totals_comparable": monthly_totals_comparable,
        "message": message,
        "unusual_check_message": (
            "Unusual-usage checks compare a household's latest bill with its own earlier bills, "
            f"so a household needs at least {MIN_BILLS_FOR_UNUSUAL_CHECK} saved bills."
        ),
        "requirements": {
            "household_trend_min_bills": MIN_BILLS_FOR_TREND,
            "unusual_check_min_bills": MIN_BILLS_FOR_UNUSUAL_CHECK,
            "unusual_threshold_pct": int(UNUSUAL_THRESHOLD * 100),
        },
    }

    insights = _build_insight_list(
        bills, month_keys, household_refs, household_analysis, usage_patterns, data_quality,
        total_units, total_expense,
    )

    return {
        "overview": {
            "total_consumption": _round(total_units),
            "total_expense": _round(total_expense),
            "total_bills": total_bills,
            "household_count": household_count,
            "month_count": len(month_keys),
        },
        "monthly_analysis": monthly_analysis,
        "household_analysis": household_analysis,
        "usage_patterns": usage_patterns,
        "insights": insights,
        "data_quality": data_quality,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def _insight(insight_id, category, status, title, message):
    return {"id": insight_id, "category": category, "status": status, "title": title, "message": message}


def _build_insight_list(bills, month_keys, household_refs, household_analysis, patterns, quality,
                        total_units, total_expense):
    total_bills = len(bills)
    if total_bills == 0:
        return [_insight(
            "no_bills", "data_availability", "notice", "No bills saved yet",
            "Insights are built from the electricity bills you save. Add a bill to get started.",
        )]

    out = []
    out.append(_insight(
        "saved_bills", "information", "info", "Saved bills",
        f"You currently have {_plural(total_bills, 'saved electricity bill')} "
        f"covering {_plural(len(month_keys), 'billing month')}.",
    ))
    out.append(_insight(
        "households", "information", "info", "Household references",
        f"Your saved bills represent {_plural(len(household_refs), 'different household reference')}."
        + (" Each reference is analysed on its own." if len(household_refs) > 1 else ""),
    ))

    usage_text = f"Your total recorded consumption across saved bills is {_kwh(total_units)}."
    if patterns["avg_units_per_bill"] is not None:
        usage_text += f" That is an average of {_kwh(patterns['avg_units_per_bill'])} per bill."
    out.append(_insight("total_consumption", "usage", "info", "Recorded consumption", usage_text))

    top = patterns["highest_bill"]
    out.append(_insight(
        "highest_bill", "expense", "info",
        "Highest recorded bill" if total_bills >= 2 else "Your saved bill",
        f"{'Your highest recorded bill is' if total_bills >= 2 else 'Your saved bill is'} {_pkr(top['amount'])} "
        f"for {top['consumer_reference']} ({_label(top['month'])}).",
    ))

    if patterns["avg_cost_per_kwh"] is not None:
        out.append(_insight(
            "cost_per_kwh", "expense", "info", "Average cost per unit",
            f"Across saved bills you paid an average of PKR {_num(patterns['avg_cost_per_kwh'])} per kWh "
            "(total amount paid divided by total units billed).",
        ))

    if patterns["outstanding_count"] > 0:
        overdue = patterns["payment_summary"]["Overdue"]["count"]
        out.append(_insight(
            "outstanding", "expense", "attention" if overdue else "notice", "Bills not marked as paid",
            f"{_plural(patterns['outstanding_count'], 'bill')} "
            f"{'is' if patterns['outstanding_count'] == 1 else 'are'} marked Unpaid or Overdue, "
            f"totalling {_pkr(patterns['outstanding_amount'])}"
            + (f", including {overdue} overdue." if overdue else "."),
        ))
    elif patterns["payment_summary"]["Paid"]["count"] == total_bills:
        out.append(_insight("all_paid", "expense", "info", "All bills paid", "Every saved bill is marked as Paid."))

    # What the data can and cannot say about change over time.
    if not quality["sufficient_for_household_trends"]:
        out.append(_insight(
            "no_household_trend", "data_availability", "notice", "Not enough history for a household trend",
            "A trend compares a household with itself, so it needs at least two bills for the same household "
            "reference. No household has more than one saved bill yet.",
        ))
    else:
        shown = [h for h in household_analysis if h["latest_change"]][:MAX_HOUSEHOLD_CHANGE_INSIGHTS]
        for household in shown:
            change = household["latest_change"]
            diff = change["units_diff"]
            if diff == 0:
                move = "was unchanged"
            else:
                pct = f" ({abs(change['units_pct']):.1f}%)" if change["units_pct"] is not None else ""
                move = f"{'rose' if diff > 0 else 'fell'} by {_kwh(abs(diff))}{pct}"
            out.append(_insight(
                f"change_{household['consumer_reference']}", "usage", "info",
                f"Latest change for {household['consumer_reference']}",
                f"Consumption {move} from {_label(change['from_month'])} to {_label(change['to_month'])}, "
                "comparing this household's two most recent saved bills.",
            ))

    if len(month_keys) >= 2 and not quality["monthly_totals_comparable"]:
        out.append(_insight(
            "months_not_comparable", "data_availability", "notice", "Monthly totals mix households",
            "The saved months do not all contain bills from the same households, so differences between "
            "monthly totals do not show one household using more or less electricity.",
        ))

    for bill in patterns["unusual_bills"]:
        out.append(_insight(
            f"unusual_{bill['consumer_reference']}", "usage", "attention",
            f"Higher than usual for {bill['consumer_reference']}",
            f"The {_label(bill['month'])} bill ({_kwh(bill['units'])}) is {bill['pct_above']:.1f}% above the average of "
            f"{_kwh(bill['baseline_units'])} across this household's {bill['earlier_bills']} earlier bills. "
            f"This is a simple {quality['requirements']['unusual_threshold_pct']}% rule, not a statistical test.",
        ))
    if quality["sufficient_for_unusual_check"] and not patterns["unusual_bills"]:
        out.append(_insight(
            "no_unusual", "usage", "info", "No unusually high bill",
            f"No household's latest bill is more than {quality['requirements']['unusual_threshold_pct']}% above "
            "its own earlier average.",
        ))

    return out
