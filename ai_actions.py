from typing import Any
from datetime import date, datetime, timedelta

ALLOWED_ACTIONS = {
    "add_expense",
    "edit_expense",
    "delete_expense",
    "search_expenses",
    "none",
}

def validate_ai_action(action: dict[str, Any]) -> tuple[bool, str]:
    """
    Validate an AI-requested financial action before SpendWise
    is allowed to execute anything.
    """

    if not isinstance(action, dict):
        return False, "Invalid AI action format."

    action_type = action.get("action")

    if action_type not in ALLOWED_ACTIONS:
        return False, "Unsupported AI action."

    if action_type == "none":
        return True, ""

    # ---------------------------------
    # ADD EXPENSE
    # ---------------------------------

    if action_type == "add_expense":

        required_fields = [
            "name",
            "amount",
            "category",
            "date",
        ]

        for field in required_fields:
            value = action.get(field)

            if value is None or (
                isinstance(value, str)
                and not value.strip()
            ):
                return False, f"Missing required field: {field}"

        # Validate name
        if not isinstance(action["name"], str):
            return False, "Expense name must be text."

        if not action["name"].strip():
            return False, "Expense name cannot be empty."

        # Validate amount
        try:
            amount = float(action["amount"])
        except (TypeError, ValueError):
            return False, "Expense amount must be numeric."

        if amount <= 0:
            return False, "Expense amount must be greater than ₹0."

        # Validate category
        if not isinstance(action["category"], str):
            return False, "Expense category must be text."

        if not action["category"].strip():
            return False, "Expense category cannot be empty."

        # Validate ISO date
        try:
            date.fromisoformat(action["date"])
        except (TypeError, ValueError):
            return False, "Expense date must use YYYY-MM-DD format."

        # Validate optional description
        description = action.get("description")

        if description is not None and not isinstance(
            description,
            str
        ):
            return False, "Expense description must be text."

        return True, ""

    # EDIT EXPENSE
    if action_type == "edit_expense":
        if not action.get("expense_id"):
            return False, "Missing expense ID."

        changes = action.get("changes")

        if not isinstance(changes, dict) or not changes:
            return False, "No expense changes were provided."

        allowed_changes = {
            "name",
            "amount",
            "category",
            "date",
            "description",
        }

        invalid_fields = set(changes) - allowed_changes

        if invalid_fields:
            return False, (
                "Unsupported expense fields: "
                + ", ".join(sorted(invalid_fields))
            )

        if "amount" in changes:
            try:
                amount = float(changes["amount"])
            except (TypeError, ValueError):
                return False, "Expense amount must be numeric."

            if amount <= 0:
                return False, "Expense amount must be greater than ₹0."

        return True, ""

    # DELETE EXPENSE
    if action_type == "delete_expense":
        if not action.get("expense_id"):
            return False, "Missing expense ID."

        return True, ""

    # ---------------------------------
    # SEARCH EXPENSES
    # ---------------------------------

    if action_type == "search_expenses":

        filters = action.get("filters", {})

        if not isinstance(filters, dict):
            return False, "Search filters must be an object."

        allowed_filters = {
            "name",
            "category",
            "date_from",
            "date_to",
            "min_amount",
            "max_amount",
        }

        invalid_filters = set(filters) - allowed_filters

        if invalid_filters:
            return False, (
                "Unsupported search filters: "
                + ", ".join(sorted(invalid_filters))
            )

        if filters.get("min_amount") is not None:
            try:
                min_amount = float(filters["min_amount"])
            except (TypeError, ValueError):
                return False, "Minimum amount must be numeric."

            if min_amount < 0:
                return False, "Minimum amount cannot be negative."

        if filters.get("max_amount") is not None:
            try:
                max_amount = float(filters["max_amount"])
            except (TypeError, ValueError):
                return False, "Maximum amount must be numeric."

            if max_amount < 0:
                return False, "Maximum amount cannot be negative."

        if (
            filters.get("min_amount") is not None
            and filters.get("max_amount") is not None
            and float(filters["min_amount"])
            > float(filters["max_amount"])
        ):
            return False, (
                "Minimum amount cannot be greater than maximum amount."
            )

        return True, ""

    return False, "Unknown action validation error."

def search_user_expenses(
    expenses,
    filters
):
    """
    Search only the expenses already loaded for the
    authenticated user.

    This function does not access another user's data
    and does not modify the database.
    """

    results = expenses.copy()

    name = filters.get("name")
    category = filters.get("category")
    date_from = filters.get("date_from")
    date_to = filters.get("date_to")
    min_amount = filters.get("min_amount")
    max_amount = filters.get("max_amount")

    if name:
        results = [
            expense
            for expense in results
            if name.lower() in expense["name"].lower()
        ]

    if category:
        results = [
            expense
            for expense in results
            if expense["category"].lower()
            == category.lower()
        ]

    if date_from:
        start_date = date.fromisoformat(date_from)

        results = [
            expense
            for expense in results
            if date.fromisoformat(expense["date"])
            >= start_date
        ]

    if date_to:
        end_date = date.fromisoformat(date_to)

        results = [
            expense
            for expense in results
            if date.fromisoformat(expense["date"])
            <= end_date
        ]

    if min_amount is not None:
        minimum = float(min_amount)

        results = [
            expense
            for expense in results
            if float(expense["amount"]) >= minimum
        ]

    if max_amount is not None:
        maximum = float(max_amount)

        results = [
            expense
            for expense in results
            if float(expense["amount"]) <= maximum
        ]

    return results

def resolve_expense_reference(
    expenses,
    reference
):
    """
    Resolve a natural-language transaction reference against
    expenses already loaded for the authenticated user.

    Returns:
        []          -> no match
        [expense]   -> unique match
        [a, b, ...] -> ambiguous, user must choose
    """

    if not reference or not isinstance(reference, str):
        return []

    reference = reference.strip().lower()

    if not reference:
        return []

    # ---------------------------------
    # LAST / MOST RECENT EXPENSE
    # ---------------------------------

    recent_references = {
        "last expense",
        "latest expense",
        "most recent expense",
        "last transaction",
        "latest transaction",
        "that expense",
        "that transaction",
    }

    if reference in recent_references:

        if not expenses:
            return []

        sorted_expenses = sorted(
            expenses,
            key=lambda expense: (
                expense["date"],
                expense.get("id", 0)
            ),
            reverse=True
        )

        return [sorted_expenses[0]]

    # ---------------------------------
    # NAME MATCHING
    # ---------------------------------

    exact_matches = [
        expense
        for expense in expenses
        if expense["name"].strip().lower() == reference
    ]

    if exact_matches:
        return exact_matches

    partial_matches = [
        expense
        for expense in expenses
        if (
            reference in expense["name"].strip().lower()
            or expense["name"].strip().lower() in reference
        )
    ]

    if partial_matches:
        return partial_matches

    # ---------------------------------
    # CATEGORY REFERENCES
    # Example: "last food expense"
    # ---------------------------------

    for expense in expenses:

        category = expense["category"].strip().lower()

        if category in reference:

            category_matches = [
                item
                for item in expenses
                if item["category"].strip().lower() == category
            ]

            category_matches = sorted(
                category_matches,
                key=lambda item: (
                    item["date"],
                    item.get("id", 0)
                ),
                reverse=True
            )

            if "last" in reference or "latest" in reference:
                return category_matches[:1]

            return category_matches

    return []

def prepare_edit_expense_action(
    expenses,
    action
):
    """
    Resolve an edit action against authenticated-user expenses
    and prepare a deterministic preview.

    Returns:
        {
            "status": "ready" | "ambiguous" | "not_found" | "invalid",
            ...
        }
    """

    if action.get("action") != "edit_expense":
        return {
            "status": "invalid",
            "message": "This is not an edit expense action."
        }

    reference = action.get("reference")
    changes = action.get("changes") or {}

    if not changes:
        return {
            "status": "invalid",
            "message": "No edit changes were provided."
        }

    # Remove unknown / null fields
    cleaned_changes = {
        key: value
        for key, value in changes.items()
        if value is not None
    }

    if not cleaned_changes:
        return {
            "status": "invalid",
            "message": "No usable edit changes were provided."
        }

    matches = resolve_expense_reference(
        expenses,
        reference
    )

    if not matches:
        return {
            "status": "not_found",
            "message": (
                "I couldn't find an expense matching that reference."
            )
        }

    if len(matches) > 1:
        return {
            "status": "ambiguous",
            "matches": matches,
            "message": (
                "I found multiple matching expenses."
            )
        }

    expense = matches[0]

    return {
        "status": "ready",
        "expense": expense,
        "changes": cleaned_changes
    }

def prepare_delete_expense_action(
    expenses,
    action
):
    """
    Resolve a delete action against authenticated-user expenses
    without deleting anything.

    Returns:
        ready
        ambiguous
        not_found
        invalid
    """

    if action.get("action") != "delete_expense":
        return {
            "status": "invalid",
            "message": "This is not a delete expense action."
        }

    reference = action.get("reference")

    if not reference:
        return {
            "status": "invalid",
            "message": "No expense reference was provided."
        }

    matches = resolve_expense_reference(
        expenses,
        reference
    )

    if not matches:
        return {
            "status": "not_found",
            "message": (
                "I couldn't find an expense matching that reference."
            )
        }

    if len(matches) > 1:
        return {
            "status": "ambiguous",
            "matches": matches,
            "message": (
                "I found multiple matching expenses."
            )
        }

    return {
        "status": "ready",
        "expense": matches[0]
    }

def resolve_ambiguity_followup(
    matches,
    followup_message
):
    """
    Resolve a follow-up such as:
    - "the ₹699 one"
    - "the second one"
    - "the September 13 one"
    - "the one on 2026-09-13"

    Returns:
        {"status": "ready", "expense": ...}
        {"status": "ambiguous"}
        {"status": "not_found"}
    """

    if not matches:
        return {
            "status": "not_found"
        }

    if not followup_message or not isinstance(
        followup_message,
        str
    ):
        return {
            "status": "not_found"
        }

    message = followup_message.strip().lower()

    if not message:
        return {
            "status": "not_found"
        }

    # -------------------------
    # ORDINAL REFERENCES
    # -------------------------

    ordinal_map = {
        "first": 0,
        "1st": 0,
        "second": 1,
        "2nd": 1,
        "third": 2,
        "3rd": 2,
        "fourth": 3,
        "4th": 3,
        "fifth": 4,
        "5th": 4,
    }

    for word, index in ordinal_map.items():
        if word in message:
            if index < len(matches):
                return {
                    "status": "ready",
                    "expense": matches[index]
                }

    # -------------------------
    # AMOUNT MATCH
    # -------------------------

    amount_matches = []

    for expense in matches:

        amount_text = (
            f"{float(expense['amount']):.2f}"
        )

        amount_simple = (
            f"{float(expense['amount']):g}"
        )

        if (
            amount_text in message
            or amount_simple in message
        ):
            amount_matches.append(expense)

    if len(amount_matches) == 1:
        return {
            "status": "ready",
            "expense": amount_matches[0]
        }

    if len(amount_matches) > 1:
        return {
            "status": "ambiguous"
        }

    # -------------------------
    # DATE MATCH
    # -------------------------

    date_matches = []

    for expense in matches:

        expense_date = str(expense["date"]).lower()

        if expense_date in message:
            date_matches.append(expense)

    if len(date_matches) == 1:
        return {
            "status": "ready",
            "expense": date_matches[0]
        }

    if len(date_matches) > 1:
        return {
            "status": "ambiguous"
        }

    # -------------------------
    # NAME MATCH
    # -------------------------

    name_matches = []

    for expense in matches:

        expense_name = (
            expense["name"]
            .strip()
            .lower()
        )

        if expense_name in message:
            name_matches.append(expense)

    if len(name_matches) == 1:
        return {
            "status": "ready",
            "expense": name_matches[0]
        }

    if len(name_matches) > 1:
        return {
            "status": "ambiguous"
        }

    return {
        "status": "not_found"
    }

def normalize_expense_date(value, today=None):
    """
    Normalize AI/user supplied expense dates.

    Supported:
    - today
    - yesterday
    - YYYY-MM-DD
    - last Monday ... last Sunday

    Returns:
        {
            "status": "ready",
            "date": "YYYY-MM-DD"
        }

        or

        {
            "status": "invalid",
            "message": "..."
        }
    """

    if today is None:
        today = date.today()

    if not value:
        return {
            "status": "invalid",
            "message": "No expense date was provided."
        }

    value = str(value).strip().lower()

    # TODAY
    if value == "today":
        return {
            "status": "ready",
            "date": today.isoformat()
        }

    # YESTERDAY
    if value == "yesterday":
        return {
            "status": "ready",
            "date": (
                today - timedelta(days=1)
            ).isoformat()
        }

    # ISO DATE
    try:
        parsed_date = datetime.strptime(
            value,
            "%Y-%m-%d"
        ).date()

        return {
            "status": "ready",
            "date": parsed_date.isoformat()
        }

    except ValueError:
        pass

    # LAST WEEKDAY
    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }

    if value.startswith("last "):

        weekday_name = value[5:].strip()

        if weekday_name in weekdays:

            target_weekday = weekdays[weekday_name]

            days_back = (
                today.weekday() - target_weekday
            ) % 7

            # "last Friday" means the previous Friday,
            # not today if today itself is Friday.
            if days_back == 0:
                days_back = 7

            normalized_date = (
                today - timedelta(days=days_back)
            )

            return {
                "status": "ready",
                "date": normalized_date.isoformat()
            }

    return {
        "status": "invalid",
        "message": (
            f"I couldn't understand the expense date '{value}'."
        )
    }

def normalize_expense_category(
    value,
    custom_categories=None
):
    """
    Normalize an AI/user supplied category against
    SpendWise built-in + authenticated user's custom categories.

    Returns:
        {
            "status": "ready",
            "category": "Food"
        }

        or

        {
            "status": "invalid",
            "message": "..."
        }
    """

    if custom_categories is None:
        custom_categories = []

    if not value:
        return {
            "status": "invalid",
            "message": "No expense category was provided."
        }

    raw_value = str(value).strip()

    if not raw_value:
        return {
            "status": "invalid",
            "message": "No expense category was provided."
        }

    # Remove common emoji/icon prefixes.
    cleaned_value = raw_value

    emoji_prefixes = [
        "🍔",
        "🚇",
        "🛍️",
        "🎓",
        "🎬",
        "💡",
        "❤️",
        "📦",
        "🏷️",
        "🎮",
    ]

    for prefix in emoji_prefixes:
        if cleaned_value.startswith(prefix):
            cleaned_value = cleaned_value[
                len(prefix):
            ].strip()

    built_in_categories = [
        "Food",
        "Travel",
        "Shopping",
        "Education",
        "Entertainment",
        "Bills",
        "Health",
        "Other",
    ]

    available_categories = (
        built_in_categories.copy()
    )

    for custom_category in custom_categories:

        if isinstance(custom_category, dict):
            name = custom_category.get("name")
        else:
            name = str(custom_category)

        if (
            name
            and name not in available_categories
        ):
            available_categories.append(name)

    # Exact case-insensitive match.
    for category in available_categories:

        if (
            category.strip().lower()
            == cleaned_value.lower()
        ):
            return {
                "status": "ready",
                "category": category
            }

    return {
        "status": "invalid",
        "message": (
            f"'{raw_value}' is not a valid SpendWise category."
        )
    }

def validate_expense_ownership(
    expenses,
    expense_id
):
    """
    Verify that an expense ID belongs to the currently
    authenticated user's already-loaded expense list.

    Never query or trust arbitrary AI-provided IDs directly.
    """

    if expense_id is None:
        return {
            "status": "invalid",
            "message": "No expense ID was provided."
        }

    for expense in expenses:

        if str(expense.get("id")) == str(expense_id):
            return {
                "status": "ready",
                "expense": expense
            }

    return {
        "status": "unauthorized",
        "message": (
            "That expense does not belong to the "
            "currently authenticated user."
        )
    }

def resolve_last_ai_expense(
    expenses,
    last_ai_expense
):
    """
    Resolve the last successfully AI-created/edited expense
    against the authenticated user's currently loaded expenses.

    Never guess:
    - 0 matches  -> not_found
    - 1 match    -> ready
    - 2+ matches -> ambiguous
    """

    if not last_ai_expense:
        return {
            "status": "not_found",
            "message": "There is no recent AI expense to refer to."
        }

    if last_ai_expense.get("deleted"):
        return {
            "status": "not_found",
            "message": "That expense was already deleted."
        }

    remembered_id = last_ai_expense.get("id")

    # Best case: an exact authenticated-user ID is available.
    if remembered_id is not None:
        ownership_result = validate_expense_ownership(
            expenses,
            remembered_id
        )

        if ownership_result.get("status") == "ready":
            return {
                "status": "ready",
                "expense": ownership_result["expense"]
            }

        return {
            "status": "not_found",
            "message": "That expense is no longer available."
        }

    # CREATE may not yet have stored the inserted database ID.
    # Fall back to an exact fingerprint match.
    matches = []

    for expense in expenses:

        same_name = (
            expense.get("name", "").strip().lower()
            == str(last_ai_expense.get("name", "")).strip().lower()
        )

        same_amount = (
            float(expense.get("amount", 0))
            == float(last_ai_expense.get("amount", 0))
        )

        same_category = (
            expense.get("category", "").strip().lower()
            == str(last_ai_expense.get("category", "")).strip().lower()
        )

        same_date = (
            str(expense.get("date"))
            == str(last_ai_expense.get("date"))
        )

        if (
            same_name
            and same_amount
            and same_category
            and same_date
        ):
            matches.append(expense)

    if len(matches) == 1:
        return {
            "status": "ready",
            "expense": matches[0]
        }

    if len(matches) > 1:
        return {
            "status": "ambiguous",
            "matches": matches,
            "message": (
                "I found multiple expenses matching the recent transaction."
            )
        }

    return {
        "status": "not_found",
        "message": "That recent expense could not be found."
    }