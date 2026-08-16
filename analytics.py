import streamlit as st
import altair as alt
import pandas as pd

from ai import (
    generate_insights,
    generate_recommendations
)

def render_analytics(
    monthly_expenses,
    category_totals,
    financial_context
):
    st.divider()

    st.title("📊 SpendWise Analytics")

    st.caption(
        "Explore your spending patterns, category distribution, and AI-powered financial insights."
    )

    chart_data = {
        category: total
        for category, total in category_totals.items()
        if total > 0
    }

    if not chart_data:
        st.info("No spending data available for analytics.")
        return

    st.subheader("📊 Spending Distribution")

    chart_df = pd.DataFrame({
        "Category": list(chart_data.keys()),
        "Amount": list(chart_data.values())
    })

    chart_col1, chart_col2, chart_col3 = st.columns(
        [1, 1, 1],
        border=True
    )

    # BAR CHART
    bar_chart = alt.Chart(chart_df).mark_bar().encode(
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
            alt.Tooltip("Amount:Q", format=".2f")
        ]
    )

    # DONUT CHART
    donut_chart = alt.Chart(chart_df).mark_arc(
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
            alt.Tooltip("Amount:Q", format=".2f")
        ]
    )

    # LINE CHART
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

    # -------------------------
    # AI INSIGHTS + RECOMMENDATIONS
    # -------------------------

    st.divider()
    st.subheader("🤖 SpendWiseAI Advisor")

    insight_col, recommendation_col = st.columns(
        2,
        border=True
    )

    # -------------------------
    # LEFT: AI INSIGHTS
    # -------------------------

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

    # -------------------------
    # RIGHT: AI RECOMMENDATIONS
    # -------------------------

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