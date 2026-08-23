from collections import defaultdict
from datetime import date


def _overall_budget_score(monthly_spending, monthly_budget):
    if monthly_budget <= 0:
        return None

    usage = monthly_spending / monthly_budget

    if usage <= 0.70:
        return 40
    if usage <= 0.80:
        return 36
    if usage <= 0.90:
        return 30
    if usage <= 1.00:
        return 22
    if usage <= 1.10:
        return 12
    if usage <= 1.25:
        return 6

    return 0


def _category_budget_score(category_budget_progress):
    if not category_budget_progress:
        return None

    health_values = []

    for info in category_budget_progress.values():
        percentage = float(info["percentage"])

        if percentage < 80:
            health = 1.0
        elif percentage < 100:
            health = 0.7
        elif percentage < 120:
            health = 0.3
        else:
            health = 0.0

        health_values.append(health)

    average_health = sum(health_values) / len(health_values)

    return round(average_health * 25, 2)


def _spending_consistency_score(monthly_expenses):
    if not monthly_expenses:
        return 20

    daily_totals = defaultdict(float)

    total_spending = 0.0

    for expense in monthly_expenses:
        amount = float(expense["amount"])
        expense_date = expense["date"]

        daily_totals[expense_date] += amount
        total_spending += amount

    if total_spending <= 0:
        return 20

    highest_day_spending = max(daily_totals.values())

    concentration = highest_day_spending / total_spending

    if concentration < 0.30:
        return 20
    if concentration < 0.40:
        return 16
    if concentration < 0.50:
        return 12
    if concentration < 0.65:
        return 7

    return 2


def _budget_headroom_score(monthly_spending, monthly_budget):
    if monthly_budget <= 0:
        return None

    remaining = monthly_budget - monthly_spending
    headroom_ratio = remaining / monthly_budget

    if headroom_ratio >= 0.30:
        return 15
    if headroom_ratio >= 0.20:
        return 12
    if headroom_ratio >= 0.10:
        return 8
    if headroom_ratio > 0:
        return 4

    return 0


def _rating(score):
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Fair"
    if score >= 40:
        return "Needs Attention"

    return "Critical"


def calculate_financial_health(
    monthly_expenses,
    monthly_budget,
    category_budget_progress
):
    monthly_spending = sum(
        float(expense["amount"])
        for expense in monthly_expenses
    )

    overall_score = _overall_budget_score(
        monthly_spending,
        monthly_budget
    )

    category_score = _category_budget_score(
        category_budget_progress
    )

    consistency_score = _spending_consistency_score(
        monthly_expenses
    )

    headroom_score = _budget_headroom_score(
        monthly_spending,
        monthly_budget
    )

    # No overall budget = no meaningful financial health score
    if overall_score is None or headroom_score is None:
        return {
            "available": False,
            "score": None,
            "rating": None,
            "reason": (
                "Set a monthly budget to enable your "
                "Financial Health Score."
            )
        }

    components = {
        "overall_budget_control": {
            "score": overall_score,
            "max": 40
        },
        "category_budget_control": {
            "score": category_score,
            "max": 25
        },
        "spending_consistency": {
            "score": consistency_score,
            "max": 20
        },
        "budget_headroom": {
            "score": headroom_score,
            "max": 15
        }
    }

    # Category budgets are optional.
    # If none exist, redistribute their 25 points proportionally.
    if category_score is None:
        available_score = (
            overall_score
            + consistency_score
            + headroom_score
        )

        available_max = 40 + 20 + 15

        final_score = round(
            (available_score / available_max) * 100
        )

        components["category_budget_control"] = {
            "score": None,
            "max": 25
        }

    else:
        final_score = round(
            overall_score
            + category_score
            + consistency_score
            + headroom_score
        )

    final_score = max(0, min(final_score, 100))

    positive_factors = []
    attention_factors = []

    budget_usage = (
        (monthly_spending / monthly_budget) * 100
        if monthly_budget > 0
        else 0
    )

    if budget_usage <= 80:
        positive_factors.append(
            "Overall monthly spending is comfortably within budget."
        )
    elif budget_usage <= 100:
        attention_factors.append(
            "Overall monthly spending is close to the budget limit."
        )
    else:
        attention_factors.append(
            "Overall monthly spending has exceeded the monthly budget."
        )

    for category_name, info in category_budget_progress.items():
        percentage = float(info["percentage"])

        if percentage >= 100:
            attention_factors.append(
                f"{category_name} has exceeded its category budget."
            )
        elif percentage >= 80:
            attention_factors.append(
                f"{category_name} is approaching its category budget limit."
            )

    if consistency_score >= 16:
        positive_factors.append(
            "Spending is reasonably distributed across the month."
        )
    elif consistency_score <= 7:
        attention_factors.append(
            "A large share of this month's spending occurred on a single day."
        )

    if headroom_score >= 12:
        positive_factors.append(
            "A healthy portion of the monthly budget remains available."
        )
    elif headroom_score == 0:
        attention_factors.append(
            "There is no remaining overall budget headroom."
        )

    return {
        "available": True,
        "score": final_score,
        "rating": _rating(final_score),
        "components": components,
        "positive_factors": positive_factors,
        "attention_factors": attention_factors,
        "monthly_spending": monthly_spending,
        "monthly_budget": float(monthly_budget)
    }