"""Notifications for BijliWise: storage, REST API and event helpers.

Ownership model: the project has no sign-in system. A household is identified by the
`consumer_reference` on its bills, so each notification stores the household it belongs to
(NULL means an application-wide System notification). Every endpoint accepts an optional
`consumer_reference`; when given, only that household's notifications can be read or changed.
Demo-mode notifications are never stored here (see demo_user.py).
"""
import logging
from contextlib import contextmanager
from datetime import date, datetime
from typing import Optional

import pymysql
from fastapi import APIRouter, HTTPException, Path, Query

from database import get_connection
from insights import UNUSUAL_THRESHOLD

logger = logging.getLogger("bijliwise.notifications")

CATEGORIES = ("Bill", "Energy", "Prediction", "System")
MIN_EARLIER_BILLS = 3  # same baseline size the Energy Insights rule uses
MAX_ID = 2_147_483_647
SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

CREATE_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        consumer_reference VARCHAR(50) NULL,
        title VARCHAR(150) NOT NULL,
        message VARCHAR(500) NOT NULL,
        category ENUM('Bill', 'Energy', 'Prediction', 'System') NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        related_entity_id INT NULL,
        action_path VARCHAR(50) NULL,
        dedupe_key VARCHAR(150) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_notifications_dedupe (dedupe_key),
        KEY idx_notifications_household (consumer_reference, created_at),
        KEY idx_notifications_unread (is_read, created_at)
    ) DEFAULT CHARSET=utf8mb4
"""

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def ensure_table(connection):
    """Idempotent: creates the table only if missing. Never alters or drops anything."""
    with connection.cursor() as cursor:
        cursor.execute(CREATE_TABLE_SQL)
    connection.commit()


@contextmanager
def _connection():
    connection = get_connection()
    try:
        ensure_table(connection)
        yield connection
    finally:
        connection.close()


def _view(row):
    created = row["created_at"]
    return {
        "id": row["id"],
        "consumer_reference": row["consumer_reference"],
        "title": row["title"],
        "message": row["message"],
        "category": row["category"],
        "is_read": bool(row["is_read"]),
        "related_entity_id": row["related_entity_id"],
        "action_path": row["action_path"],
        "created_at": created.isoformat() if isinstance(created, (datetime, date)) else str(created),
    }


def create_notification(connection, *, title, message, category, consumer_reference=None,
                        related_entity_id=None, action_path=None, dedupe_key=None):
    """Insert one notification. Returns its id, or None if the dedupe_key already exists."""
    if category not in CATEGORIES:
        raise ValueError(f"Unknown notification category: {category}")
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO notifications
                    (consumer_reference, title, message, category, related_entity_id, action_path, dedupe_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (consumer_reference, title[:150], message[:500], category,
                 related_entity_id, action_path, dedupe_key),
            )
            new_id = cursor.lastrowid
        connection.commit()
        return new_id
    except pymysql.err.IntegrityError as error:
        connection.rollback()
        if error.args and error.args[0] == 1062:  # duplicate dedupe_key: the event was already notified
            return None
        raise


# ---------------- event helpers (called by real events only) ----------------

def _month_text(value):
    if isinstance(value, (date, datetime)):
        return f"{SHORT_MONTHS[value.month - 1]} {value.year}"
    return str(value)[:7]


def _energy_change_check(connection, reference, month, units):
    """Notify only when this is the household's newest bill AND at least 3 earlier bills exist."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM electricity_bills WHERE consumer_reference = %s AND billing_month > %s LIMIT 1",
            (reference, month),
        )
        if cursor.fetchone() is not None:
            return  # a back-filled older bill is not a "latest usage" event
        cursor.execute(
            """
            SELECT units_consumed FROM electricity_bills
            WHERE consumer_reference = %s AND billing_month < %s
            ORDER BY billing_month DESC LIMIT %s
            """,
            (reference, month, MIN_EARLIER_BILLS),
        )
        earlier = [float(r["units_consumed"]) for r in cursor.fetchall()]
    if len(earlier) < MIN_EARLIER_BILLS:
        return  # not enough history: no claim is made
    baseline = sum(earlier) / len(earlier)
    if baseline <= 0:
        return
    change = (units - baseline) / baseline
    label = _month_text(month)
    key_month = str(month)[:7]
    if change > UNUSUAL_THRESHOLD:
        create_notification(
            connection, consumer_reference=reference, category="Energy", action_path="insights",
            title="Usage above the usual level",
            message=(f"{reference}: {label} used {units:.0f} kWh, {change * 100:.0f}% above the average "
                     f"of its previous {MIN_EARLIER_BILLS} saved bills ({baseline:.0f} kWh)."),
            dedupe_key=f"energy-high:{reference}:{key_month}",
        )
    elif change < -UNUSUAL_THRESHOLD:
        create_notification(
            connection, consumer_reference=reference, category="Energy", action_path="insights",
            title="Usage below the usual level",
            message=(f"{reference}: {label} used {units:.0f} kWh, {abs(change) * 100:.0f}% below the average "
                     f"of its previous {MIN_EARLIER_BILLS} saved bills ({baseline:.0f} kWh)."),
            dedupe_key=f"energy-low:{reference}:{key_month}",
        )


def notify_bill_created(bill_id, reference, billing_month, units):
    """Called after a bill was saved. Never raises: a notification problem must not fail the bill."""
    try:
        with _connection() as connection:
            create_notification(
                connection, consumer_reference=reference, category="Bill", related_entity_id=bill_id,
                action_path="bills", title="Bill saved",
                message=f"The bill for {_month_text(billing_month)} ({units:.0f} kWh) was saved for {reference}.",
                dedupe_key=f"bill-created:{bill_id}",
            )
            _energy_change_check(connection, reference, billing_month, float(units))
    except Exception:
        logger.exception("Could not create notifications for bill %s", bill_id)


def notify_bill_overdue(bill_id, reference, billing_month):
    """Called when an update changes a bill's status to Overdue. Never raises."""
    try:
        with _connection() as connection:
            create_notification(
                connection, consumer_reference=reference, category="Bill", related_entity_id=bill_id,
                action_path="bills", title="Bill marked overdue",
                message=f"The bill for {_month_text(billing_month)} for {reference} is now marked Overdue.",
                dedupe_key=f"bill-overdue:{bill_id}",
            )
    except Exception:
        logger.exception("Could not create overdue notification for bill %s", bill_id)


# ---------------- REST API ----------------

def _scope(consumer_reference):
    if consumer_reference is None:
        return "", ()
    return " AND consumer_reference = %s", (consumer_reference,)


def _fail(error, action):
    logger.exception("Notifications: could not %s", action)
    return HTTPException(status_code=500, detail=f"Could not {action}.")


ReferenceQuery = Query(default=None, min_length=1, max_length=50)


@router.get("")
def list_notifications(limit: int = Query(50, ge=1, le=100), unread_only: bool = False,
                       consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            sql = "SELECT * FROM notifications WHERE 1=1" + scope_sql
            if unread_only:
                sql += " AND is_read = 0"
            sql += " ORDER BY created_at DESC, id DESC LIMIT %s"
            with connection.cursor() as cursor:
                cursor.execute(sql, scope_args + (limit,))
                rows = cursor.fetchall()
                cursor.execute("SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0" + scope_sql, scope_args)
                unread = cursor.fetchone()["n"]
        return {"success": True, "unread_count": unread, "total": len(rows),
                "notifications": [_view(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as error:
        raise _fail(error, "load notifications")


@router.get("/unread-count")
def unread_count(consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0" + scope_sql, scope_args)
                return {"success": True, "unread_count": cursor.fetchone()["n"]}
    except Exception as error:
        raise _fail(error, "load the unread count")


@router.patch("/read-all")
def mark_all_read(consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            with connection.cursor() as cursor:
                cursor.execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0" + scope_sql, scope_args)
                changed = cursor.rowcount
            connection.commit()
        return {"success": True, "updated": changed}
    except Exception as error:
        raise _fail(error, "mark notifications as read")


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int = Path(ge=1, le=MAX_ID), consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM notifications WHERE id = %s" + scope_sql, (notification_id,) + scope_args)
                if cursor.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Notification not found.")
                cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = %s", (notification_id,))
            connection.commit()
        return {"success": True, "notification_id": notification_id}
    except HTTPException:
        raise
    except Exception as error:
        raise _fail(error, "mark the notification as read")


@router.delete("/{notification_id}")
def delete_notification(notification_id: int = Path(ge=1, le=MAX_ID), consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM notifications WHERE id = %s" + scope_sql, (notification_id,) + scope_args)
                removed = cursor.rowcount
            connection.commit()
        if removed == 0:
            raise HTTPException(status_code=404, detail="Notification not found.")
        return {"success": True, "notification_id": notification_id}
    except HTTPException:
        raise
    except Exception as error:
        raise _fail(error, "delete the notification")


@router.delete("")
def clear_notifications(consumer_reference: Optional[str] = ReferenceQuery):
    try:
        with _connection() as connection:
            scope_sql, scope_args = _scope(consumer_reference)
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM notifications WHERE 1=1" + scope_sql, scope_args)
                removed = cursor.rowcount
            connection.commit()
        return {"success": True, "deleted": removed}
    except Exception as error:
        raise _fail(error, "clear notifications")
