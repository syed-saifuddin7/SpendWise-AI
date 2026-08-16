import sqlite3
DATABASE_NAME = "spendwise.db"
def get_connection():
    return sqlite3.connect(DATABASE_NAME)

def create_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT
        )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL
    )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()

def add_expense(name, amount, category, date, description):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO expenses (name, amount, category, date, description)
        VALUES (?, ?, ?, ?, ?)
    """, (name, amount, category, str(date), description))

    connection.commit()
    connection.close()

def get_expenses():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, name, amount, category, date, description
        FROM expenses
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    connection.close()

    expenses = []

    for row in rows:
        expenses.append({
            "id": row[0],
            "name": row[1],
            "amount": row[2],
            "category": row[3],
            "date": row[4],
            "description": row[5]
        })

    return expenses

def update_expense(expense_id, name, amount, category, date, description):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE expenses
        SET name = ?, amount = ?, category = ?, date = ?, description = ?
        WHERE id = ?
    """, (
        name,
        amount,
        category,
        str(date),
        description,
        expense_id
    ))

    connection.commit()
    connection.close()

def delete_expense(expense_id):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        DELETE FROM expenses
        WHERE id = ?
    """, (expense_id,))

    connection.commit()
    connection.close()

def set_budget(month, amount):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO budgets (month, amount)
        VALUES (?, ?)
        ON CONFLICT(month)
        DO UPDATE SET amount = excluded.amount
    """, (month, amount))

    connection.commit()
    connection.close()

def get_budget(month):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT amount
        FROM budgets
        WHERE month = ?
    """, (month,))

    row = cursor.fetchone()

    connection.close()

    return row[0] if row else 0

def add_chat_message(role, content):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO chat_history (role, content)
        VALUES (?, ?)
    """, (role, content))

    cursor.execute("""
        DELETE FROM chat_history
        WHERE id NOT IN (
            SELECT id
            FROM chat_history
            ORDER BY id DESC
            LIMIT 50
        )
    """)

    connection.commit()
    connection.close()


def get_chat_history():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT role, content
        FROM chat_history
        ORDER BY id ASC
    """)

    rows = cursor.fetchall()
    connection.close()

    return [
        {
            "role": row[0],
            "content": row[1]
        }
        for row in rows
    ]


def clear_chat_history():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("DELETE FROM chat_history")

    connection.commit()
    connection.close()

