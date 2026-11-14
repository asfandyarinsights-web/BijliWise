import pymysql

from datetime import date
from typing import Literal
from pydantic import BaseModel, Field


from fastapi import FastAPI, HTTPException
from database import get_connection

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
