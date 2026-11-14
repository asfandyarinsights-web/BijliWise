
from database import get_connection

try:
    connection = get_connection()

    print("SUCCESS: Connected to BijliWise MySQL database!")

    with connection.cursor() as cursor:
        cursor.execute("SELECT DATABASE() AS database_name")
        result = cursor.fetchone()

        print("Connected database:", result["database_name"])

    connection.close()
    print("Database connection closed successfully.")

except Exception as error:
    print("DATABASE CONNECTION FAILED:")
    print(error)
