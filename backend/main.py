import pymysql

from datetime import date
from typing import Literal
from pydantic import BaseModel, Field


from fastapi import FastAPI, HTTPException
from database import get_connection

app = FastAPI(
    title="BijliWise API",
    description="Smart Energy. Smart Pakistan.",
    version="1.0.0"
)
class BillCreate(BaseModel):
    consumer_reference: str = Field(min_length=1, max_length=50)
    billing_month: date
    units_consumed: float = Field(gt=0)
    total_amount: float = Field(ge=0)
    issue_date: date | None = None
    due_date: date | None = None
    payment_status: Literal["Paid", "Unpaid", "Overdue"] = "Unpaid"

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