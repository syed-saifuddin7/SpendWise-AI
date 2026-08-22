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

    # Update the actual category
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

    # Keep existing expenses synchronized with the renamed category
    supabase.table("expenses").update({
        "category": clean_name
    }).eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    return response.data

def delete_category(user_id, category_id):
    supabase = get_supabase_client()

    # Move expenses using this custom category to built-in "Other"
    supabase.table("expenses").update({
        "category": "Other",
        "category_id": None
    }).eq(
        "category_id", category_id
    ).eq(
        "user_id", user_id
    ).execute()

    # Delete the custom category
    response = (
        supabase
        .table("categories")
        .delete()
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )

    return response.data
