import pymysql

from datetime import date
from typing import Literal
from pydantic import BaseModel, Field


from fastapi import FastAPI, HTTPException, Path, Query
from database import get_connection
from insights import build_energy_insights
from demo_predictions import router as demo_router
from predictions import (
    ALLOWED_HORIZONS,
    REQUIRED_OBSERVATIONS,
    build_forecast,
    build_readiness,
    is_valid_horizon,
    load_model,
    model_artifact_found,
    summarize_households,
)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BijliWise API",
    description="Smart Energy. Smart Pakistan.",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Synthetic Demo Mode (CSV + trained model; does not use MySQL)
app.include_router(demo_router)

class BillCreate(BaseModel):
    consumer_reference: str = Field(min_length=1, max_length=50)
    billing_month: date
    units_consumed: float = Field(gt=0)
    total_amount: float = Field(ge=0)
    issue_date: date | None = None
    due_date: date | None = None
    payment_status: Literal["Paid", "Unpaid", "Overdue"] = "Unpaid"

class BillUpdate(BillCreate):
    pass

@app.get("/")
def home():
    return {
        "message": "Welcome to BijliWise API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "BijliWise"
    }


@app.get("/api/analytics/monthly")
def get_monthly_analytics():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    DATE_FORMAT(billing_month, '%Y-%m') AS month,
                    SUM(units_consumed) AS total_units,
                    SUM(total_amount) AS total_expense,
                    COUNT(*) AS total_bills
                FROM electricity_bills
                GROUP BY YEAR(billing_month), MONTH(billing_month)
                ORDER BY YEAR(billing_month) ASC,
                         MONTH(billing_month) ASC
            """)

            monthly_data = cursor.fetchall()

        return {
            "success": True,
            "total_months": len(monthly_data),
            "analytics": monthly_data
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve monthly analytics: {str(error)}"
        )

    finally:
        if connection:
            connection.close()


@app.get("/api/insights/energy")
def get_energy_insights():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    consumer_reference,
                    billing_month,
                    units_consumed,
                    total_amount,
                    payment_status
                FROM electricity_bills
                ORDER BY billing_month ASC, consumer_reference ASC
            """)

            bills = cursor.fetchall()

        # All calculations are in insights.py (plain Python, no extra dependencies).
        return {
            "success": True,
            **build_energy_insights(bills)
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve energy insights: {str(error)}"
        )

    finally:
        if connection:
            connection.close()


def fetch_prediction_rows(consumer_reference=None):
    """Bills used by the Predictions module. One household when a reference is given."""
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            if consumer_reference is None:
                cursor.execute("""
                    SELECT consumer_reference, billing_month, units_consumed, total_amount
                    FROM electricity_bills
                    ORDER BY consumer_reference ASC, billing_month ASC
                """)
            else:
                cursor.execute("""
                    SELECT consumer_reference, billing_month, units_consumed, total_amount
                    FROM electricity_bills
                    WHERE consumer_reference = %s
                    ORDER BY billing_month ASC
                """, (consumer_reference,))

            return cursor.fetchall()

    finally:
        connection.close()


@app.get("/api/predictions/households")
def get_prediction_households():
    try:
        summary = summarize_households(fetch_prediction_rows())
        model = load_model()

        return {
            "success": True,
            "required_observations": REQUIRED_OBSERVATIONS,
            "allowed_horizons": list(ALLOWED_HORIZONS),
            "model": {
                "artifact_found": model_artifact_found(),
                "trained": model is not None,
                "validated": model is not None and getattr(model, "validated", False) is True
            },
            **summary
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve prediction households: {str(error)}"
        )


@app.get("/api/predictions/readiness/{consumer_reference}")
def get_prediction_readiness(consumer_reference: str = Path(min_length=1, max_length=50)):
    try:
        readiness = build_readiness(
            consumer_reference,
            fetch_prediction_rows(consumer_reference),
            load_model()
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not check forecasting readiness: {str(error)}"
        )

    if readiness is None:
        raise HTTPException(
            status_code=404,
            detail="No bills were found for this household reference."
        )

    return {"success": True, **readiness}


@app.get("/api/predictions/forecast/{consumer_reference}")
def get_prediction_forecast(
    consumer_reference: str = Path(min_length=1, max_length=50),
    horizon: int = Query(1)
):
    if not is_valid_horizon(horizon):
        raise HTTPException(
            status_code=422,
            detail="Forecast horizon must be 1, 3 or 6 months."
        )

    try:
        forecast = build_forecast(
            consumer_reference,
            fetch_prediction_rows(consumer_reference),
            horizon,
            load_model()
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate forecast: {str(error)}"
        )

    if forecast is None:
        raise HTTPException(
            status_code=404,
            detail="No bills were found for this household reference."
        )

    # available is False (with the reason) unless a validated model produced real predictions.
    return {"success": True, **forecast}


@app.get("/api/bills")
def get_all_bills():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT *
                FROM electricity_bills
                ORDER BY billing_month DESC
            """)

            bills = cursor.fetchall()

        return {
            "success": True,
            "total": len(bills),
            "bills": bills
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve electricity bills: {str(error)}"
        )

    finally:
        if connection:
            connection.close()


@app.get("/api/bills/{bill_id}")
def get_bill_by_id(bill_id: int):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM electricity_bills WHERE id = %s",
                (bill_id,)
            )

            bill = cursor.fetchone()

        if bill is None:
            raise HTTPException(
                status_code=404,
                detail="Electricity bill not found"
            )

        return {
            "success": True,
            "bill": bill
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve bill: {str(error)}"
        )

    finally:
        if connection:
            connection.close()



@app.post("/api/bills", status_code=201)
def create_bill(bill: BillCreate):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO electricity_bills (
                    consumer_reference,
                    billing_month,
                    units_consumed,
                    total_amount,
                    issue_date,
                    due_date,
                    payment_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                bill.consumer_reference,
                bill.billing_month,
                bill.units_consumed,
                bill.total_amount,
                bill.issue_date,
                bill.due_date,
                bill.payment_status
            ))

            bill_id = cursor.lastrowid

        connection.commit()

        return {
            "success": True,
            "message": "Electricity bill added successfully",
            "bill_id": bill_id
        }

    except pymysql.err.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="A bill for this consumer and billing month already exists."
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not create bill: {str(error)}"
        )

    finally:
        if connection:
            connection.close()


@app.put("/api/bills/{bill_id}")
def update_bill(bill_id: int, bill: BillUpdate):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            # First, check whether the bill exists
            cursor.execute(
                "SELECT id FROM electricity_bills WHERE id = %s",
                (bill_id,)
            )

            existing_bill = cursor.fetchone()

            if existing_bill is None:
                raise HTTPException(
                    status_code=404,
                    detail="Electricity bill not found"
                )

            # Update the existing bill
            cursor.execute("""
                UPDATE electricity_bills
                SET
                    consumer_reference = %s,
                    billing_month = %s,
                    units_consumed = %s,
                    total_amount = %s,
                    issue_date = %s,
                    due_date = %s,
                    payment_status = %s
                WHERE id = %s
            """, (
                bill.consumer_reference,
                bill.billing_month,
                bill.units_consumed,
                bill.total_amount,
                bill.issue_date,
                bill.due_date,
                bill.payment_status,
                bill_id
            ))

        connection.commit()

        return {
            "success": True,
            "message": "Electricity bill updated successfully",
            "bill_id": bill_id
        }

    except HTTPException:
        raise

    except pymysql.err.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="A bill for this consumer and billing month already exists."
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not update bill: {str(error)}"
        )

    finally:
        if connection:
            connection.close()

@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: int):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM electricity_bills WHERE id = %s",
                (bill_id,)
            )

            existing_bill = cursor.fetchone()

            if existing_bill is None:
                raise HTTPException(
                    status_code=404,
                    detail="Electricity bill not found"
                )

            cursor.execute(
                "DELETE FROM electricity_bills WHERE id = %s",
                (bill_id,)
            )

        connection.commit()

        return {
            "success": True,
            "message": "Electricity bill deleted successfully",
            "bill_id": bill_id
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete bill: {str(error)}"
        )

    finally:
        if connection:
            connection.close()
