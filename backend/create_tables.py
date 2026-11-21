
from database import get_connection
from notifications import ensure_table as ensure_notifications_table


def create_electricity_bills_table():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS electricity_bills (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    consumer_reference VARCHAR(50) NOT NULL,
                    billing_month DATE NOT NULL,
                    units_consumed DECIMAL(10, 2) NOT NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    issue_date DATE,
                    due_date DATE,
                    payment_status VARCHAR(20) DEFAULT 'Unpaid',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    UNIQUE (consumer_reference, billing_month)
                )
            """)

        connection.commit()
        print("SUCCESS: electricity_bills table created!")

    except Exception as error:
        print("TABLE CREATION FAILED:")
        print(error)

    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    create_electricity_bills_table()
    _connection = get_connection()
    try:
        ensure_notifications_table(_connection)  # idempotent; never drops or alters data
        print("SUCCESS: notifications table is ready!")
    finally:
        _connection.close()
