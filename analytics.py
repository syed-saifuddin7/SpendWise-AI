import streamlit as st
import altair as alt
import pandas as pd
from datetime import date, datetime

from ai import (
    generate_insights,
    generate_recommendations
)


def render_analytics(
    expenses,
    monthly_expenses,
    category_totals,
    financial_context,
    monthly_budget,
    category_budget_progress
):
    # =========================================================
    # ANALYTICS V2 — DATA FOUNDATION
    # =========================================================

    today = date.today()
    current_month = today.strftime("%Y-%m")

    if today.month == 1:
        previous_month = f"{today.year - 1}-12"
    else:
        previous_month = f"{today.year}-{today.month - 1:02d}"

    current_month_label = datetime.strptime(
        current_month,
        "%Y-%m"
    ).strftime("%B %Y")

    previous_month_label = datetime.strptime(
        previous_month,
        "%Y-%m"
    ).strftime("%B %Y")

    previous_month_expenses = [
        expense
        for expense in expenses
        if expense["date"].startswith(previous_month)
    ]

    current_month_total = sum(
        float(expense["amount"])
        for expense in monthly_expenses
    )

    previous_month_total = sum(
        float(expense["amount"])
        for expense in previous_month_expenses
    )

    if previous_month_total > 0:
        month_change_percentage = (
            (current_month_total - previous_month_total)
            / previous_month_total
        ) * 100
    elif current_month_total > 0:
        month_change_percentage = None
    else:
        month_change_percentage = 0.0

    days_elapsed = today.day
    average_daily_spending = (
        current_month_total / days_elapsed
        if days_elapsed > 0
        else 0.0
    )

    largest_expenses = sorted(
        monthly_expenses,
        key=lambda expense: float(expense["amount"]),
        reverse=True
    )[:5]

    # =========================================================
    # TOP SPENDING CATEGORY
    # =========================================================

    active_categories = {
        category: float(amount)
        for category, amount in category_totals.items()
        if float(amount) > 0
    }

    if active_categories:
        top_category = max(
            active_categories,
            key=active_categories.get
        )

        top_category_amount = active_categories[top_category]

        top_category_share = (
            (top_category_amount / current_month_total) * 100
            if current_month_total > 0
            else 0.0
        )
    else:
        top_category = None
        top_category_amount = 0.0
        top_category_share = 0.0

    # =========================================================
    # WEEK-BY-WEEK SPENDING
    # =========================================================

    weekly_spending = {
        "Week 1": 0.0,
        "Week 2": 0.0,
        "Week 3": 0.0,
        "Week 4": 0.0,
        "Week 5": 0.0
    }

    for expense in monthly_expenses:
        expense_date = datetime.strptime(
            expense["date"],
            "%Y-%m-%d"
        )

        day = expense_date.day

        if day <= 7:
            week = "Week 1"
        elif day <= 14:
            week = "Week 2"
        elif day <= 21:
            week = "Week 3"
        elif day <= 28:
            week = "Week 4"
        else:
            week = "Week 5"

        weekly_spending[week] += float(expense["amount"])

    # =========================================================
    # BUDGET VS ACTUAL
    # =========================================================

    overall_budget = float(monthly_budget or 0)
    budget_remaining = overall_budget - current_month_total

    budget_used_percentage = (
        (current_month_total / overall_budget) * 100
        if overall_budget > 0
        else 0.0
    )

    # =========================================================
    # CATEGORY BUDGET PERFORMANCE
    # =========================================================

    category_budget_performance = []

    for category_name, info in category_budget_progress.items():
        spent = float(info["spent"])
        budget = float(info["budget"])
        percentage = float(info["percentage"])

        if percentage >= 100:
            status = "Over Budget"
        elif percentage >= 80:
            status = "Approaching Limit"
        else:
            status = "Within Budget"

        category_budget_performance.append({
            "category": category_name,
            "spent": spent,
            "budget": budget,
            "percentage": percentage,
            "status": status
        })

    # =========================================================
    # RECURRING VS DISCRETIONARY
    # =========================================================

    recurring_spending = sum(
        float(expense["amount"])
        for expense in monthly_expenses
        if expense.get("recurring_expense_id") is not None
    )

    discretionary_spending = sum(
        float(expense["amount"])
        for expense in monthly_expenses
        if expense.get("recurring_expense_id") is None
    )

    if current_month_total > 0:
        recurring_share = (
            recurring_spending / current_month_total
        ) * 100

        discretionary_share = (
            discretionary_spending / current_month_total
        ) * 100
    else:
        recurring_share = 0.0
        discretionary_share = 0.0

    # =========================================================
    # PAGE HEADER
    # =========================================================

    st.divider()
    st.title("📊 SpendWise Analytics")

    st.caption(
        "Explore your spending patterns, category distribution, "
        "budget performance, and AI-powered financial insights."
    )

    # =========================================================
    # MONTHLY COMPARISON
    # =========================================================

    st.subheader("📅 Monthly Comparison")

    compare_col1, compare_col2 = st.columns(
        2,
        border=True
    )

    with compare_col1:
        if month_change_percentage is None:
            st.metric(
                current_month_label,
                f"₹{current_month_total:.2f}",
                delta="No previous-month baseline"
            )
        else:
            st.metric(
                current_month_label,
                f"₹{current_month_total:.2f}",
                delta=f"{month_change_percentage:+.1f}% vs previous month",
                delta_color="inverse"
            )

    with compare_col2:
        st.metric(
            previous_month_label,
            f"₹{previous_month_total:.2f}"
        )

    # =========================================================
    # QUICK METRICS
    # =========================================================

    quick_col1, quick_col2 = st.columns(
        2,
        border=True
    )

    with quick_col1:
        st.metric(
            "📆 Average Daily Spending",
            f"₹{average_daily_spending:.2f} / day"
        )

    with quick_col2:
        if top_category:
            st.metric(
                "🏆 Top Spending Category",
                top_category,
                delta=(
                    f"₹{top_category_amount:.2f} • "
                    f"{top_category_share:.1f}% of spending"
                ),
                delta_color="off"
            )
        else:
            st.metric(
                "🏆 Top Spending Category",
                "No spending yet"
            )

    # =========================================================
    # LARGEST EXPENSES
    # =========================================================

    st.divider()
    st.subheader("💸 Largest Expenses")

    if largest_expenses:
        for expense in largest_expenses:
            st.write(
                f"**{expense['name']}** — "
                f"₹{float(expense['amount']):.2f} "
                f"({expense['category']})"
            )
    else:
        st.info("No expenses available for this month.")

    # =========================================================
    # WEEK-BY-WEEK SPENDING
    # =========================================================

    st.divider()
    st.subheader("📆 Week-by-Week Spending")

    if current_month_total > 0:

        weekly_df = pd.DataFrame({
            "Week": list(weekly_spending.keys()),
            "Amount": list(weekly_spending.values())
        })

        weekly_chart = alt.Chart(
            weekly_df
        ).mark_bar().encode(
            x=alt.X(
                "Week:N",
                title="Week",
                sort=[
                    "Week 1",
                    "Week 2",
                    "Week 3",
                    "Week 4",
                    "Week 5"
                ]
            ),
            y=alt.Y(
                "Amount:Q",
                title="Amount Spent (₹)"
            ),
            tooltip=[
                "Week:N",
                alt.Tooltip(
                    "Amount:Q",
                    title="Spent",
                    format=".2f"
                )
            ]
        ).properties(
            height=300
        )

        st.altair_chart(
            weekly_chart,
            width="stretch"
        )

    else:
        st.info(
            "No weekly spending data available for this month."
        )

    # =========================================================
    # BUDGET VS ACTUAL
    # =========================================================

    st.divider()
    st.subheader("🎯 Budget vs Actual")

    if overall_budget > 0:
        budget_col1, budget_col2 = st.columns(
            2,
            border=True
        )

        with budget_col1:
            st.metric(
                "Monthly Budget",
                f"₹{overall_budget:.2f}"
            )

        with budget_col2:
            st.metric(
                "Actual Spending",
                f"₹{current_month_total:.2f}",
                delta=f"{budget_used_percentage:.1f}% used",
                delta_color="off"
            )

        if budget_remaining >= 0:
            st.caption(
                f"₹{budget_remaining:.2f} budget remaining"
            )
        else:
            st.warning(
                f"Budget exceeded by ₹{abs(budget_remaining):.2f}"
            )
    else:
        st.info(
            "Set a monthly budget to view Budget vs Actual analysis."
        )

    # =========================================================
    # CATEGORY BUDGET PERFORMANCE
    # =========================================================

    st.divider()
    st.subheader("🎯 Category Budget Performance")

    if category_budget_performance:
        for item in category_budget_performance:
            st.markdown(
                f"**{item['category']}**"
            )

            st.write(
                f"₹{item['spent']:.2f} / "
                f"₹{item['budget']:.2f} "
                f"({item['percentage']:.1f}% used)"
            )

            progress_value = (
                min(item["spent"] / item["budget"], 1.0)
                if item["budget"] > 0
                else 0.0
            )

            st.progress(progress_value)

            if item["status"] == "Over Budget":
                st.error("🚨 Over Budget")
            elif item["status"] == "Approaching Limit":
                st.warning("⚠️ Approaching Limit")
            else:
                st.caption("✅ Within Budget")

            st.write("")
    else:
        st.info(
            "No category budgets configured for this month."
        )

    # =========================================================
    # RECURRING VS DISCRETIONARY
    # =========================================================

    st.divider()
    st.subheader("🔁 Recurring vs Discretionary Spending")

    recurring_col, discretionary_col = st.columns(
        2,
        border=True
    )

    with recurring_col:
        st.metric(
            "Recurring",
            f"₹{recurring_spending:.2f}",
            delta=f"{recurring_share:.1f}% of spending",
            delta_color="off"
        )

    with discretionary_col:
        st.metric(
            "Discretionary",
            f"₹{discretionary_spending:.2f}",
            delta=f"{discretionary_share:.1f}% of spending",
            delta_color="off"
        )

    # =========================================================
    # SPENDING DISTRIBUTION
    # =========================================================

    st.divider()
    st.subheader("📊 Spending Distribution")

    chart_data = {
        category: total
        for category, total in category_totals.items()
        if total > 0
    }

    if chart_data:
        chart_df = pd.DataFrame({
            "Category": list(chart_data.keys()),
            "Amount": list(chart_data.values())
        })

        chart_col1, chart_col2, chart_col3 = st.columns(
            [1, 1, 1],
            border=True
        )

        bar_chart = alt.Chart(
            chart_df
        ).mark_bar().encode(
            x=alt.X(
                "Category:N",
                title="Category",
                sort=None
            ),
            y=alt.Y(
                "Amount:Q",
                title="Amount Spent (₹)"
            ),
            tooltip=[
                "Category:N",
                alt.Tooltip(
                    "Amount:Q",
                    title="Spent",
                    format=".2f"
                )
            ]
        )

        donut_chart = alt.Chart(
            chart_df
        ).mark_arc(
            innerRadius=60,
            outerRadius=95
        ).encode(
            theta=alt.Theta("Amount:Q"),
            color=alt.Color(
                "Category:N",
                legend=None
            ),
            tooltip=[
                "Category:N",
                alt.Tooltip(
                    "Amount:Q",
                    title="Spent",
                    format=".2f"
                )
            ]
        )

        daily_data = pd.DataFrame(monthly_expenses)

        if not daily_data.empty:
            daily_data["date"] = pd.to_datetime(
                daily_data["date"]
            )

            daily_totals = (
                daily_data
                .groupby("date")["amount"]
                .sum()
                .reset_index()
                .sort_values("date")
            )

            line_chart = alt.Chart(
                daily_totals
            ).mark_line(
                point=True
            ).encode(
                x=alt.X(
                    "date:T",
                    title="Date",
                    axis=alt.Axis(
                        format="%b %d",
                        labelAngle=0
                    )
                ),
                y=alt.Y(
                    "amount:Q",
                    title="Amount Spent (₹)"
                ),
                tooltip=[
                    alt.Tooltip(
                        "date:T",
                        title="Date",
                        format="%d %b %Y"
                    ),
                    alt.Tooltip(
                        "amount:Q",
                        title="Spent",
                        format=".2f"
                    )
                ]
            )

        with chart_col1:
            st.markdown("#### Category Spending")
            st.altair_chart(
                bar_chart,
                width="stretch"
            )

        with chart_col2:
            st.markdown("#### Spending Share")
            st.altair_chart(
                donut_chart,
                width="stretch"
            )

        with chart_col3:
            st.markdown("#### Daily Spending Trend")

            if not daily_data.empty:
                st.altair_chart(
                    line_chart,
                    width="stretch"
                )
            else:
                st.info("No daily spending data.")
    else:
        st.info(
            "No spending data available for distribution charts this month."
        )

    # =========================================================
    # AI INSIGHTS + RECOMMENDATIONS
    # =========================================================

    st.divider()
    st.subheader("🤖 SpendWiseAI Advisor")

    insight_col, recommendation_col = st.columns(
        2,
        border=True
    )

    with insight_col:
        st.markdown("### 🧠 Spending Insights")

        if st.button(
            "✨ Analyze My Spending",
            key="generate_ai_insights"
        ):
            with st.spinner(
                "SpendWiseAI is analyzing your expenses..."
            ):
                try:
                    insights = generate_insights(
                        financial_context
                    )
                    st.session_state.ai_insights = insights
                except Exception:
                    st.session_state.ai_insights = (
                        "⚠️ SpendWiseAI couldn't generate insights right now."
                    )

        if st.session_state.ai_insights:
            st.markdown("#### 🤖 Analysis")
            st.write(
                st.session_state.ai_insights
            )

    with recommendation_col:
        st.markdown("### 💡 Saving Recommendations")

        if st.button(
            "💰 Suggest Ways to Save",
            key="generate_ai_recommendations"
        ):
            with st.spinner(
                "SpendWiseAI is finding saving opportunities..."
            ):
                try:
                    recommendations = generate_recommendations(
                        financial_context
                    )
                    st.session_state.ai_recommendations = recommendations
                except Exception:
                    st.session_state.ai_recommendations = (
                        "⚠️ SpendWiseAI couldn't generate recommendations right now."
                    )

        if st.session_state.ai_recommendations:
            st.markdown("#### 🤖 Recommendations")
            st.write(
                st.session_state.ai_recommendations
            )
