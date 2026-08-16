import streamlit as st
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

def render_monthly_summary(expenses):

    st.divider()
    st.title("📅 Monthly Spending Summary")

    st.caption(
        "Review your monthly expenses, spending trends, and comparison with the previous month."
    )
    available_months = sorted(
        {
            datetime.strptime(
                expense["date"],
                "%Y-%m-%d"
            ).strftime("%Y-%m")
            for expense in expenses
        },
        reverse=True
    )

    current_month = date.today().strftime("%Y-%m")

    if current_month not in available_months:
        available_months.insert(0, current_month)

    selected_month = st.selectbox(
        "Select Month",
        available_months,
        format_func=lambda month: datetime.strptime(
            month,
            "%Y-%m"
        ).strftime("%B %Y"),
        key="monthly_summary_month"
    )

    selected_month_name = datetime.strptime(
        selected_month,
        "%Y-%m"
    ).strftime("%B %Y")

    st.caption(
        f"Summary for {selected_month_name}"
    )
    
    selected_month_expenses = [
        expense
        for expense in expenses
        if expense["date"].startswith(selected_month)
    ]
    if not selected_month_expenses:
        st.info(
            f"📭 No expenses recorded for "
            f"{selected_month_name} yet."
        )
        return
    selected_total = sum(
        expense["amount"]
        for expense in selected_month_expenses
    )

    selected_month_date = datetime.strptime(
        selected_month,
        "%Y-%m"
    )
    previous_month_date = (
        selected_month_date - relativedelta(months=1)
    )
    previous_month = previous_month_date.strftime("%Y-%m")
    previous_month_expenses = [
        expense
        for expense in expenses
        if expense["date"].startswith(previous_month)
    ]
    previous_total = sum(
        expense["amount"]
        for expense in previous_month_expenses
    )
    if previous_total > 0:
        spending_change = (
            (selected_total - previous_total)
            / previous_total
        ) * 100
    else:
        spending_change = None

    selected_transactions = len(
        selected_month_expenses
    )

    if selected_transactions > 0:
        average_expense = selected_total / selected_transactions
    else:
        average_expense = 0

    category_totals = {}

    for expense in selected_month_expenses:
        category = expense["category"]

        category_totals[category] = (
            category_totals.get(category, 0)
            + expense["amount"]
        )

    if len(category_totals) > 0:
        top_category = max(
            category_totals,
            key=category_totals.get
        )
    else:
        top_category = "None"

    with st.container(key="monthly_summary_metrics"):

        metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(
            4,
            border=True
        )

        with metric_col1:
            st.metric(
                "💸 Total Spent",
                f"₹{selected_total:.2f}"
            )

        with metric_col2:
            st.metric(
                "🧾 Transactions",
                selected_transactions
            )

        with metric_col3:
            st.metric(
                "📊 Average Expense",
                f"₹{average_expense:.2f}"
            )

        with metric_col4:
            st.metric(
                "🏆 Top Category",
                top_category
            )

    st.markdown("### 📈 Previous Month Comparison")
    previous_month_name = previous_month_date.strftime(
    "%B %Y"
    )
    if spending_change is None:

        st.info(
            f"No spending data available for "
            f"{previous_month_name}."
        )

    else:
        comparison_col1, comparison_col2 = st.columns(
            2,
            border=True
        )

        with comparison_col1:
            st.metric(
                f"Previous Month ({previous_month_name})",
                f"₹{previous_total:.2f}"
            )

        with comparison_col2:

            st.metric(
                "Spending Change",
                f"{abs(spending_change):.1f}%",
                delta=(
                    f"{spending_change:+.1f}%"
                )       
            )

    st.divider()
    st.markdown("### 📊 Top Spending Categories")

    category_icons = {
        "Food": "🍔",
        "Travel": "🚇",
        "Shopping": "🛍️",
        "Education": "🎓",
        "Entertainment": "🎬",
        "Bills": "💡",
        "Health": "❤️",
        "Other": "📦"
    }   

    rank_icons = {
        1: "🥇",
        2: "🥈",
        3: "🥉"
    }

    sorted_categories = sorted(
        category_totals.items(),
        key=lambda item: item[1],
        reverse=True
    )[:5]

    if sorted_categories:

        highest_category_amount = sorted_categories[0][1]

        for rank, (category, total) in enumerate(
            sorted_categories,
            start=1
        ):

            rank_icon = rank_icons.get(
                rank,
                f"{rank}."
            )

            category_icon = category_icons.get(
                category,
                "📦"
            )

            label_col, amount_col = st.columns(
                [4, 1]
            )

            with label_col:
                st.markdown(
                    f"**{rank_icon} {category_icon} {category}**"
                )

            with amount_col:
                st.markdown(
                    f"**₹{total:.2f}**"
                )

            progress_value = (
                total / highest_category_amount
                if highest_category_amount > 0
                else 0
            )

            st.progress(progress_value)