def build_ai_context(
    current_month,
    monthly_budget,
    total_spent,
    budget_left,
    budget_percentage,
    category_totals,
    category_budget_progress,
    financial_health,
    monthly_expenses,
    previous_month,
    previous_month_total,
    previous_month_expenses,
    recurring_expenses,
    custom_categories,
    today,
    user_preferences
):
    # -------------------------
    # CATEGORY SPENDING CONTEXT
    # -------------------------

    category_context = "\n".join(
        f"- {category}: ₹{amount:.2f}"
        for category, amount in category_totals.items()
    )

    # -------------------------
    # CATEGORY BUDGET CONTEXT
    # -------------------------

    category_budget_context = []

    for category_name, info in category_budget_progress.items():
        spent = info["spent"]
        budget = info["budget"]
        percentage = info["percentage"]

        if percentage >= 100:
            status = "OVER BUDGET"
        elif percentage >= 80:
            status = "APPROACHING LIMIT"
        else:
            status = "WITHIN BUDGET"

        category_budget_context.append(
            f"{category_name}: "
            f"₹{spent:.2f} spent / ₹{budget:.2f} budget "
            f"({percentage:.1f}% used, {status})"
        )

    category_budget_context_text = (
        "\n".join(category_budget_context)
        if category_budget_context
        else "No category budgets have been set."
    )

    # -------------------------
    # FINANCIAL HEALTH CONTEXT
    # -------------------------

    if financial_health["available"]:

        health_components = financial_health["components"]

        health_context = f"""
FINANCIAL HEALTH SCORE

Score: {financial_health['score']}/100
Rating: {financial_health['rating']}

Component Breakdown:
- Overall Budget Control:
  {health_components['overall_budget_control']['score']}/40

- Category Budget Control:
  {
      health_components['category_budget_control']['score']
      if health_components['category_budget_control']['score'] is not None
      else 'Not scored'
  }/25

- Spending Consistency:
  {health_components['spending_consistency']['score']}/20

- Budget Headroom:
  {health_components['budget_headroom']['score']}/15

Positive Factors:
{chr(10).join(
    f"- {factor}"
    for factor in financial_health["positive_factors"]
) or "- None"}

Needs Attention:
{chr(10).join(
    f"- {factor}"
    for factor in financial_health["attention_factors"]
) or "- None"}

IMPORTANT:
The Financial Health Score is calculated deterministically by SpendWise.
Do not recalculate, replace, or invent a different score.
You may explain the score and suggest ways to improve it using the supplied financial data.
"""

    else:

        health_context = """
FINANCIAL HEALTH SCORE

Unavailable.

Reason:
The user has not configured the required monthly budget.

Do not invent a Financial Health Score.
"""

    # -------------------------
    # BASE FINANCIAL CONTEXT
    # -------------------------

    financial_context = f"""
CURRENT FINANCIAL SUMMARY

Month: {current_month}
Monthly Budget: ₹{monthly_budget:.2f}
Total Spent: ₹{total_spent:.2f}
Budget Remaining: ₹{budget_left:.2f}
Budget Used: {budget_percentage:.1f}%

CATEGORY SPENDING
{category_context}

CATEGORY BUDGETS:
{category_budget_context_text}

{health_context}

Number of Transactions: {len(monthly_expenses)}
"""

    # -------------------------
    # PREVIOUS MONTH CONTEXT
    # -------------------------

    financial_context += f"""

PREVIOUS MONTH SUMMARY

Month: {previous_month}
Total Spent: ₹{previous_month_total:.2f}
Number of Transactions: {len(previous_month_expenses)}
"""

    financial_context += "\nPREVIOUS MONTH TRANSACTIONS"

    if previous_month_expenses:
        for expense in previous_month_expenses:
            financial_context += (
                f"\n- {expense['name']} | "
                f"{expense['category']} | "
                f"₹{expense['amount']:.2f} | "
                f"{expense['date']}"
            )
    else:
        financial_context += (
            "\n- No transactions recorded in the previous month."
        )

    # -------------------------
    # CURRENT MONTH TRANSACTIONS
    # -------------------------

    financial_context += "\n\nCURRENT MONTH TRANSACTIONS"

    if monthly_expenses:
        for expense in monthly_expenses:
            financial_context += (
                f"\n- {expense['name']} | "
                f"{expense['category']} | "
                f"₹{expense['amount']:.2f} | "
                f"{expense['date']}"
            )
    else:
        financial_context += (
            "\n- No transactions recorded this month."
        )

    # -------------------------
    # RECURRING EXPENSE CONTEXT
    # -------------------------

    financial_context += "\n\nRECURRING EXPENSES"

    if recurring_expenses:
        for recurring in recurring_expenses:

            status = (
                "ACTIVE"
                if recurring.get("is_active", True)
                else "PAUSED"
            )

            financial_context += (
                f"\n- {recurring['name']} | "
                f"{recurring['category']} | "
                f"₹{float(recurring['amount']):.2f} | "
                f"{recurring['frequency'].title()} | "
                f"{status} | "
                f"Next run: {recurring['next_run_date']}"
            )

    else:
        financial_context += (
            "\n- No recurring expenses configured."
        )

    # -------------------------
    # CUSTOM CATEGORY CONTEXT
    # -------------------------

    financial_context += "\n\nCUSTOM CATEGORIES"

    if custom_categories:
        for custom_category in custom_categories:
            name = custom_category["name"]
            emoji = custom_category.get("emoji") or "🏷️"

            financial_context += (
                f"\n- {emoji} {name}"
            )
    else:
        financial_context += (
            "\n- No custom categories configured."
        )

    # -------------------------
    # BUDGET INTELLIGENCE CONTEXT
    # -------------------------

    financial_context += "\n\nBUDGET INTELLIGENCE"

    if monthly_budget > 0:
        if budget_left >= 0:
            financial_context += (
                f"\n- Overall budget remaining: ₹{budget_left:.2f}"
            )
        else:
            financial_context += (
                f"\n- Overall budget exceeded by: ₹{abs(budget_left):.2f}"
            )

        financial_context += (
            f"\n- Overall budget used: {budget_percentage:.1f}%"
        )
    else:
        financial_context += (
            "\n- No monthly budget configured."
        )

    if category_budget_progress:
        for category_name, info in category_budget_progress.items():
            spent = float(info["spent"])
            budget = float(info["budget"])
            percentage = float(info["percentage"])

            remaining = budget - spent

            if percentage >= 100:
                category_status = (
                    f"OVER BUDGET by ₹{abs(remaining):.2f}"
                )
            elif percentage >= 80:
                category_status = (
                    f"APPROACHING LIMIT with ₹{remaining:.2f} remaining"
                )
            else:
                category_status = (
                    f"WITHIN BUDGET with ₹{remaining:.2f} remaining"
                )

            financial_context += (
                f"\n- {category_name}: {category_status}"
            )
    else:
        financial_context += (
            "\n- No category budgets configured."
        )

    # -------------------------
    # CURRENT DATE CONTEXT
    # -------------------------

    import calendar

    days_in_month = calendar.monthrange(
        today.year,
        today.month
    )[1]

    days_remaining = days_in_month - today.day

    financial_context += f"""

CURRENT DATE CONTEXT

Today: {today.isoformat()}
Current Month: {current_month}
Day of Month: {today.day}
Days Remaining in Current Month: {days_remaining}
"""

    # -------------------------
    # USER PREFERENCE CONTEXT
    # -------------------------

    financial_context += "\n\nUSER PREFERENCES"

    if user_preferences:
        for key, value in user_preferences.items():
            financial_context += (
                f"\n- {key.replace('_', ' ').title()}: {value}"
            )
    else:
        financial_context += (
            "\n- No user preferences configured."
        )

    # -------------------------
    # AFFORDABILITY CONTEXT
    # -------------------------

    upcoming_recurring_total = 0.0

    for recurring in recurring_expenses:
        if not recurring.get("is_active", True):
            continue

        next_run_date = recurring.get("next_run_date")

        if (
            next_run_date
            and next_run_date.startswith(current_month)
        ):
            upcoming_recurring_total += float(
                recurring["amount"]
            )

    effective_available_budget = (
        budget_left - upcoming_recurring_total
    )

    if days_remaining > 0:
        safe_daily_budget = (
            max(effective_available_budget, 0)
            / days_remaining
        )
    else:
        safe_daily_budget = 0.0

    financial_context += f"""

AFFORDABILITY CONTEXT

Overall Budget Remaining: ₹{budget_left:.2f}
Upcoming Active Recurring Expenses This Month: ₹{upcoming_recurring_total:.2f}
Effective Available Budget After Upcoming Recurring Expenses: ₹{effective_available_budget:.2f}
Days Remaining This Month: {days_remaining}
Approximate Safe Daily Spend For Rest Of Month: ₹{safe_daily_budget:.2f}

IMPORTANT:
When answering affordability questions:
- Use these values as guidance.
- Do not claim certainty.
- Mention if the purchase would significantly reduce remaining budget.
- Mention relevant category-budget limits if available.
- Do not describe unused budget as savings.
"""

    # -------------------------
    # PREVIOUS MONTH CATEGORY TOTALS
    # -------------------------

    previous_month_category_totals = {}

    for expense in previous_month_expenses:
        category = expense["category"]

        previous_month_category_totals[category] = (
            previous_month_category_totals.get(category, 0.0)
            + float(expense["amount"])
        )

    # -------------------------
    # MONTH-OVER-MONTH CATEGORY COMPARISON
    # -------------------------

    financial_context += "\n\nMONTH-OVER-MONTH CATEGORY COMPARISON"

    all_comparison_categories = set(
        category_totals.keys()
    ) | set(
        previous_month_category_totals.keys()
    )

    if all_comparison_categories:
        for category in sorted(all_comparison_categories):

            current_amount = float(
                category_totals.get(category, 0)
            )

            previous_amount = float(
                previous_month_category_totals.get(category, 0)
            )

            difference = current_amount - previous_amount

            financial_context += (
                f"\n- {category}: "
                f"Current ₹{current_amount:.2f} | "
                f"Previous ₹{previous_amount:.2f} | "
                f"Difference ₹{difference:+.2f}"
            )
    else:
        financial_context += (
            "\n- No category comparison data available."
        )

    return financial_context