import supabase

from supabase_client import get_supabase_client


# -------------------------
# EXPENSES
# -------------------------

def add_expense(user_id,name,amount,category,date,description,category_id=None):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "name": name,
        "amount": float(amount),
        "category": category,
        "date": str(date),
        "description": description,
        "category_id": category_id
    }

    response = (
        supabase
        .table("expenses")
        .insert(data)
        .execute()
    )

    return response.data

def import_expenses(user_id, records):
    """Import already validated expense rows for one authenticated user."""
    if not records:
        return []

    supabase = get_supabase_client()
    data = []

    for record in records:
        data.append({
            "user_id": user_id,
            "name": record["name"],
            "amount": float(record["amount"]),
            "category": record["category"],
            "date": str(record["date"]),
            "description": record.get("description", ""),
            "category_id": record.get("category_id")
        })

    response = (
        supabase
        .table("expenses")
        .insert(data)
        .execute()
    )

    return response.data


def get_expenses(user_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("expenses")
        .select("*")
        .eq("user_id", user_id)
        .order("id", desc=True)
        .execute()
    )

    return response.data

def update_expense(
    user_id,
    expense_id,
    name,
    amount,
    category,
    date,
    description,
    category_id=None
):
    supabase = get_supabase_client()

    data = {
        "name": name,
        "amount": float(amount),
        "category": category,
        "date": str(date),
        "description": description,
        "category_id": category_id
    }

    response = (
        supabase
        .table("expenses")
        .update(data)
        .eq("id", expense_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data

def delete_expense(user_id, expense_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("expenses")
        .delete()
        .eq("id", expense_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data

# -------------------------
# RECURRING EXPENSES
# -------------------------

def add_recurring_expense(
    user_id,
    name,
    amount,
    category,
    category_id,
    description,
    frequency,
    start_date,
    next_run_date
):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "name": name.strip(),
        "amount": float(amount),
        "category": category,
        "category_id": category_id,
        "description": description.strip() if description else "",
        "frequency": frequency,
        "start_date": str(start_date),
        "next_run_date": str(next_run_date),
        "is_active": True,
        "last_generated_date": None
    }

    response = (
        supabase
        .table("recurring_expenses")
        .insert(data)
        .execute()
    )

    return response.data


def get_recurring_expenses(user_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("recurring_expenses")
        .select("*")
        .eq("user_id", user_id)
        .order("next_run_date")
        .execute()
    )

    return response.data


def update_recurring_expense(
    user_id,
    recurring_id,
    name,
    amount,
    category,
    category_id,
    description,
    frequency,
    start_date,
    next_run_date
):
    supabase = get_supabase_client()

    data = {
        "name": name.strip(),
        "amount": float(amount),
        "category": category,
        "category_id": category_id,
        "description": description.strip() if description else "",
        "frequency": frequency,
        "start_date": str(start_date),
        "next_run_date": str(next_run_date)
    }

    response = (
        supabase
        .table("recurring_expenses")
        .update(data)
        .eq("id", recurring_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data


def set_recurring_expense_active(
    user_id,
    recurring_id,
    is_active
):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("recurring_expenses")
        .update({
            "is_active": bool(is_active)
        })
        .eq("id", recurring_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data


def delete_recurring_expense(
    user_id,
    recurring_id
):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("recurring_expenses")
        .delete()
        .eq("id", recurring_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data


# -------------------------
# BUDGETS
# -------------------------

def set_budget(user_id, month, amount):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "month": month,
        "amount": float(amount)
    }

    response = (
        supabase
        .table("budgets")
        .upsert(
            data,
            on_conflict="user_id,month"
        )
        .execute()
    )

    return response.data


def get_budget(user_id, month):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("budgets")
        .select("amount")
        .eq("user_id", user_id)
        .eq("month", month)
        .limit(1)
        .execute()
    )

    if not response.data:
        return 0

    return float(response.data[0]["amount"])


# -------------------------
# CHAT HISTORY
# -------------------------

def add_chat_message(user_id, role, content):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "role": role,
        "content": content
    }

    response = (
        supabase
        .table("chat_history")
        .insert(data)
        .execute()
    )

    return response.data


def get_chat_history(user_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("chat_history")
        .select("id, role, content, created_at")
        .eq("user_id", user_id)
        .order("created_at")
        .limit(50)
        .execute()
    )

    return [
        {
            "role": row["role"],
            "content": row["content"]
        }
        for row in response.data
    ]


def clear_chat_history(user_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("chat_history")
        .delete()
        .eq("user_id", user_id)
        .execute()
    )

    return response.data

# -------------------------
# CUSTOM CATEGORIES
# -------------------------

def add_category(user_id, name, emoji=None):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "name": name.strip(),
        "emoji": emoji.strip() if emoji else None
    }

    response = (
        supabase
        .table("categories")
        .insert(data)
        .execute()
    )

    return response.data


def get_categories(user_id):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("categories")
        .select("*")
        .eq("user_id", user_id)
        .order("name")
        .execute()
    )

    return response.data

def update_category(user_id, category_id, name, emoji=None):
    supabase = get_supabase_client()

    clean_name = name.strip()

    # Update category itself
    response = (
        supabase
        .table("categories")
        .update({
            "name": clean_name,
            "emoji": emoji.strip() if emoji else None
        })
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )

    # Keep linked expenses synchronized
    supabase.table("expenses").update({
        "category": clean_name
    }).eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    # Keep linked category budgets synchronized
    supabase.table("category_budgets").update({
        "category_name": clean_name
    }).eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    return response.data

def delete_category(user_id, category_id):
    supabase = get_supabase_client()

    # Move linked expenses to built-in Other
    supabase.table("expenses").update({
        "category": "Other",
        "category_id": None
    }).eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    # Delete linked category budgets
    supabase.table("category_budgets").delete().eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    # Delete category itself
    response = (
        supabase
        .table("categories")
        .delete()
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data

# -------------------------
# CATEGORY BUDGETS
# -------------------------

def set_category_budget(
    user_id,
    category_name,
    month,
    amount,
    category_id=None
):
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "category_name": category_name,
        "category_id": category_id,
        "month": month,
        "amount": float(amount)
    }

    response = (
        supabase
        .table("category_budgets")
        .upsert(
            data,
            on_conflict="user_id,category_name,month"
        )
        .execute()
    )

    return response.data


def get_category_budgets(user_id, month):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("category_budgets")
        .select("*")
        .eq("user_id", user_id)
        .eq("month", month)
        .order("category_name")
        .execute()
    )

    return response.data


def delete_category_budget(
    user_id,
    category_name,
    month
):
    supabase = get_supabase_client()

    response = (
        supabase
        .table("category_budgets")
        .delete()
        .eq("user_id", user_id)
        .eq("category_name", category_name)
        .eq("month", month)
        .execute()
    )

    return response.data

def process_due_recurring_expenses(user_id):
    from datetime import date, timedelta
    import calendar
    supabase = get_supabase_client()
    today = date.today().isoformat()

    due_recurring = (
        supabase
        .table("recurring_expenses")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .lte("next_run_date", today)
        .execute()
    )

    if not due_recurring.data:
        return 0

    created_count = 0

    for recurring in due_recurring.data:

        # Duplicate protection:
        existing = (
            supabase
            .table("expenses")
            .select("id")
            .eq("user_id", user_id)
            .eq("recurring_expense_id", recurring["id"])
            .eq("date", recurring["next_run_date"])
            .execute()
        )

        if existing.data:
            continue

        # Create the expense.
        supabase.table("expenses").insert({
            "user_id": user_id,
            "name": recurring["name"],
            "amount": recurring["amount"],
            "category": recurring["category"],
            "category_id": recurring["category_id"],
            "description": recurring["description"],
            "date": recurring["next_run_date"],
            "recurring_expense_id": recurring["id"]
        }).execute()

        created_count += 1

        current_run = date.fromisoformat(recurring["next_run_date"])

        # Calculate the next occurrence.
        if recurring["frequency"] == "weekly":
            next_run = current_run + timedelta(days=7)

        elif recurring["frequency"] == "monthly":
            month = current_run.month + 1
            year = current_run.year

            if month > 12:
                month = 1
                year += 1

            last_day = calendar.monthrange(year, month)[1]
            day = min(current_run.day, last_day)

            next_run = date(year, month, day)

        else:  # yearly
            year = current_run.year + 1

            try:
                next_run = current_run.replace(year=year)
            except ValueError:
                next_run = date(year, 2, 28)

        supabase.table("recurring_expenses").update({
            "last_generated_date": recurring["next_run_date"],
            "next_run_date": next_run.isoformat()
        }).eq("id", recurring["id"]).execute()

    return created_count