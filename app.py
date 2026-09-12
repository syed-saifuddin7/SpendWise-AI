import streamlit as st
from cloud_db import (
    add_expense,
    delete_category_budget,
    get_category_budgets,
    get_expenses,
    update_expense,
    delete_expense,
    set_budget,
    get_budget,
    add_chat_message,
    get_chat_history,
    get_categories,
    add_category,
    update_category,
    delete_category,
    clear_chat_history,
    set_category_budget,
    get_category_budgets,
    delete_category_budget, 
    add_recurring_expense,
    get_recurring_expenses,
    update_recurring_expense,
    set_recurring_expense_active,
    delete_recurring_expense,
    process_due_recurring_expenses,
)
import calendar
from datetime import date, timedelta
from ai import ask_ai
from ai_context import build_ai_context
from monthly_summary import render_monthly_summary
from reports import render_reports
from analytics import render_analytics
from auth import is_logged_in, sign_out
from auth_ui import render_login, render_signup
from supabase_client import get_supabase_client
from financial_health import calculate_financial_health

st.set_page_config(
    page_title="SpendWise AI",
    page_icon="💰",
    layout="wide"
)

# -----------------------------
# AUTHENTICATION GATE
# -----------------------------

if not is_logged_in():

    # Center the authentication UI
    left, center, right = st.columns([1, 2, 1])

    with center:
        st.title("💰 SpendWise AI")
        st.caption("Your personal AI-powered expense manager")

        login_tab, signup_tab = st.tabs([
            "🔐 Login",
            "📝 Create Account"
        ])

        with login_tab:
            render_login()

        with signup_tab:
            render_signup()

    st.stop()


# -----------------------------
# LOGGED-IN USER / LOGOUT
# -----------------------------

auth_user = st.session_state.get("auth_user", {})
user_id = auth_user["id"]
custom_categories = get_categories(user_id)

# -------------------------
# CATEGORY ICONS
# -------------------------

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
for custom_category in custom_categories:
    custom_name = custom_category["name"]
    custom_emoji = custom_category.get("emoji") or "🏷️"

    category_icons[custom_name] = custom_emoji

# -----------------------------
# SESSION STATE
# -----------------------------

# UI state is stored in Session State.
# User financial data now comes from Supabase.
if "editing_id" not in st.session_state:
    st.session_state.editing_id = None
if "chat_history" not in st.session_state:
    st.session_state.chat_history = get_chat_history(user_id)
if "ai_insights" not in st.session_state:
    st.session_state.ai_insights = None
if "ai_recommendations" not in st.session_state:
    st.session_state.ai_recommendations = None
if "chat_open" not in st.session_state:
    st.session_state.chat_open = False
if "editing_category_id" not in st.session_state:
    st.session_state.editing_category_id = None
if "category_budget_widget_version" not in st.session_state:
    st.session_state.category_budget_widget_version = 0

# -----------------------------
# AUTHENTICATED USER DATA
# -----------------------------
generated_recurring_count = process_due_recurring_expenses(user_id)

# Expenses now come from Supabase
expenses = get_expenses(user_id)

# Recurring expenses now come from Supabase
recurring_expenses = get_recurring_expenses(user_id)

current_month = date.today().strftime("%Y-%m")

today = date.today()

if today.month == 1:
    previous_month = f"{today.year - 1}-12"
else:
    previous_month = f"{today.year}-{today.month - 1:02d}"

previous_month_expenses = [
    expense
    for expense in expenses
    if expense["date"].startswith(previous_month)
]
previous_month_total = sum(
    float(expense["amount"])
    for expense in previous_month_expenses
)
monthly_expenses = [
    expense
    for expense in expenses
    if expense["date"].startswith(current_month)
]

# Budget still uses SQLite temporarily.
monthly_budget = get_budget(
    user_id,
    current_month
)

category_budgets = get_category_budgets(
    user_id,
    current_month
)

category_budget_map = {
    item["category_name"]: float(item["amount"])
    for item in category_budgets
}

st.markdown("""
<style>

    /* =========================
       GLOBAL LAYOUT
    ========================= */    

    .block-container {
        padding-top: 2rem;
    }
    
    /* =========================
       FLOATING AI CHAT
    ========================= */
    .st-key-floating_chat {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        width: auto;
    }

    .st-key-floating_chat button {
        width: 64px;
        height: 64px;
        min-width: 64px;
        border-radius: 50%;
        font-size: 28px;
        padding: 0;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

.st-key-spendwise_chat_panel {
    position: fixed;
    right: 18px;
    top: 64px;
    bottom: 18px;

    width: 560px;
    max-width: calc(100vw - 36px);

    box-sizing: border-box;
    background: #0e1117;
    border: 1px solid #3a3f4b;
    border-radius: 18px;
    padding: 12px 14px;

    z-index: 9998;
    overflow: hidden;

    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.45);
}

/* Compact header */
.st-key-spendwise_chat_panel h3 {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

/* Native Streamlit scrolling handles the chat body reliably. */
.st-key-spendwise_chat_body {
    border: 0 !important;
}

/* Keep quick-action labels readable and compact. */
.st-key-spendwise_chat_body button {
    white-space: normal !important;
    line-height: 1.1 !important;
    min-height: 36px !important;
}

/* Compact the message form inside the scrollable body. */
.st-key-spendwise_chat_body [data-testid="stForm"] {
    margin-top: 4px;
}

@media (max-width: 650px) {
    .st-key-spendwise_chat_panel {
        left: 8px;
        right: 8px;
        top: 64px;
        bottom: 8px;

        width: auto;
        max-width: none;

        border-radius: 14px;
        padding: 10px;
    }
}

    
    /* =========================
       METRICS & CONTAINERS
    ========================= */    

    div[data-testid="stMetric"] {
        border-radius: 12px;
        transition: transform 0.2s ease, border-color 0.2s ease;
    }

    div[data-testid="stVerticalBlockBorderWrapper"] {
        border-radius: 12px;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    div[data-testid="stMetric"]:hover {
        transform: translateY(-3px);
        border-color: #ffffff !important;
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
    }

    div[data-testid="stVerticalBlockBorderWrapper"]:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.65) !important;
        box-shadow: 0 0 14px rgba(255, 255, 255, 0.08);
    }

    /* =========================
       BUTTON EFFECTS
    ========================= */

    .stButton button,
    .stDownloadButton button,
    div[data-testid="stFormSubmitButton"] button {
        transition: transform 0.15s ease,
                    border-color 0.15s ease,
                    box-shadow 0.15s ease !important;
    }

    .stButton button:hover,
    .stDownloadButton button:hover,
    div[data-testid="stFormSubmitButton"] button:hover {
        transform: translateY(-2px) !important;
        border-color: #ffffff !important;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.12) !important;
    }

    /* -------------------------
        TRANSACTION HEADER
    ------------------------- */

    .transaction-header {
        display: grid;
        grid-template-columns: 3fr 2.4fr 1.7fr 2.2fr 1.6fr;
        align-items: center;

        padding: 6px 0px;
        margin-bottom: 4px;

        border: none;
        border-radius: 0;
        background: transparent;

        font-weight: 700;
        font-size: 14px;
    }

    .transaction-header div {
        padding: 2px 0;
    }

    /* =========================
       RESPONSIVE — <= 900px
    ========================= */

    @media (max-width: 900px) {

    /* Dashboard metrics */
    .st-key-dashboard_metrics div[data-testid="stHorizontalBlock"] {
        flex-wrap: wrap !important;
    }

    .st-key-dashboard_metrics div[data-testid="stColumn"] {
        flex: 1 1 calc(50% - 1rem) !important;
        width: calc(50% - 1rem) !important;
        min-width: calc(50% - 1rem) !important;
    }

    /* Transactions */
    .st-key-transactions_table {
        font-size: 13px;
    }

    .st-key-transactions_table
    div[data-testid="stMarkdownContainer"] p {
        font-size: 13px;
    }

    .st-key-transactions_table button {
        padding-left: 8px !important;
        padding-right: 8px !important;
        min-width: 38px !important;
    }

    .st-key-transactions_table
    div[data-testid="stButton"] button {
        min-width: 42px !important;
        width: 42px !important;
        padding: 0 !important;
    }

    .transaction-header {
        grid-template-columns: 3fr 2.4fr 1.7fr 2.2fr 1.7fr;
        font-size: 12px;
        padding: 9px 10px;
    }

    /* =========================
       PHONE TRANSACTIONS — <= 768px
       Keep each transaction on one compact row.
       Edit and Delete use separate top-level columns so the buttons
       remain visible and never overlap on phone widths.
    ========================= */
    @media (max-width: 768px) {
        .transaction-header {
            display: none !important;
        }

        .st-key-transactions_table div[data-testid="stHorizontalBlock"] {
            flex-wrap: nowrap !important;
            gap: 0.22rem !important;
            align-items: center !important;
        }

        .st-key-transactions_table div[data-testid="stColumn"] {
            min-width: 0 !important;
            width: auto !important;
        }

        .st-key-transactions_table
        div[data-testid="stMarkdownContainer"] p {
            font-size: 11px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .st-key-transactions_table
        div[data-testid="stButton"] button {
            width: 34px !important;
            min-width: 34px !important;
            height: 34px !important;
            padding: 0 !important;
        }
    }
@media (max-width: 650px) {

    .st-key-spendwise_chat_panel {
        left: 8px;
        right: 8px;
        top: 8px;
        bottom: 8px;

        width: auto;
        max-width: none;

        border-radius: 14px;
        padding: 12px;
    }
}

</style>
""", unsafe_allow_html=True)

if st.query_params.get("logout") == "1":
    sign_out()
    st.query_params.clear()
    st.rerun()

# -------------------------
# PAGE ROUTING
# -------------------------

page = st.query_params.get(
    "page",
    "dashboard"
)

dashboard_class = "active" if page == "dashboard" else ""
analytics_class = "active" if page == "analytics" else ""
monthly_class = "active" if page == "monthly" else ""
reports_class = "active" if page == "reports" else ""

st.markdown(f"""
<style>

/* =========================
   NAVBAR
========================= */

.spendwise-navbar {{
    position: fixed;
    top: 12px;
    left: 12px;
    right: 85px;
    z-index: 999999;

    display: flex;
    align-items: center;
    gap: 8px;
}}

.spendwise-navbar a {{
    color: #fafafa !important;
    text-decoration: none !important;

    padding: 7px 12px;
    border-radius: 7px;

    font-size: 14px;
    font-weight: 500;

    transition: background 0.2s ease;
}}

.spendwise-navbar a:hover {{
    background: rgba(255, 255, 255, 0.10);
}}

.spendwise-navbar a.active {{
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.08);
}}

/* =========================
   RESPONSIVE — <= 900px
========================= */

@media (max-width: 900px) {{

    /* Monthly budget */
    .st-key-monthly_budget_controls
    div[data-testid="stHorizontalBlock"] {{
        flex-wrap: wrap !important;
    }}

    .st-key-monthly_budget_controls
    div[data-testid="stColumn"] {{
        flex: 1 1 100% !important;
        width: 100% !important;
        min-width: 100% !important;
    }}

    .st-key-monthly_budget_controls button {{
        width: auto !important;
        white-space: nowrap !important;
    }}

    /* Navbar */
    .spendwise-navbar {{
        left: 12px;
        right: auto;
        gap: 4px;
        flex-wrap: wrap;
        max-width: calc(100vw - 150px);
    }}

    .spendwise-navbar a {{
        padding: 5px 7px;
        font-size: 12px;
    }}

    /* Monthly summary metrics */
    .st-key-monthly_summary_metrics
    div[data-testid="stHorizontalBlock"] {{
        flex-wrap: wrap !important;
    }}

    .st-key-monthly_summary_metrics
    div[data-testid="stColumn"] {{
        flex: 1 1 calc(50% - 1rem) !important;
        width: calc(50% - 1rem) !important;
        min-width: calc(50% - 1rem) !important;
    }}
}}

</style>

<div class="spendwise-navbar">
<a class="{dashboard_class}" href="?page=dashboard" target="_self">🏠 Dashboard</a>
<a class="{analytics_class}" href="?page=analytics" target="_self">📊 Analytics</a>
<a class="{monthly_class}" href="?page=monthly" target="_self">📅 Monthly Summary</a>
<a class="{reports_class}" href="?page=reports" target="_self">📄 Reports</a>
<a class="logout-link" href="?logout=1" target="_self">🚪 Logout</a>
</div>
""", unsafe_allow_html=True)
# -------------------------
# CALCULATIONS
# -------------------------

total_spent = sum(
    expense["amount"]
    for expense in monthly_expenses
)

budget_left = monthly_budget - total_spent

if monthly_budget > 0:
    budget_percentage = (total_spent / monthly_budget) * 100
else:
    budget_percentage = 0

category_totals = {
    "Food": 0,
    "Travel": 0,
    "Shopping": 0,
    "Education": 0,
    "Entertainment": 0,
    "Bills": 0,
    "Health": 0,
    "Other": 0
}
for expense in monthly_expenses:
    category = expense["category"]
    category_totals[category] = (
        category_totals.get(category, 0) + float(expense["amount"])
    )

# -----------------------------
# CATEGORY BUDGET PROGRESS
# -----------------------------

category_budget_progress = {}

for category_name, budget_amount in category_budget_map.items():

    spent = float(
        category_totals.get(category_name, 0)
    )

    budget_amount = float(budget_amount)

    percentage = (
        (spent / budget_amount) * 100
        if budget_amount > 0
        else 0
    )

    category_budget_progress[category_name] = {
        "spent": spent,
        "budget": budget_amount,
        "percentage": percentage
    }

st.title("💰 SpendWise AI")

user_preferences = {
    "currency": "INR"
}

financial_health = calculate_financial_health(
    monthly_expenses,
    monthly_budget,
    category_budget_progress
)

financial_context = build_ai_context(
    current_month=current_month,
    previous_month=previous_month,
    monthly_budget=monthly_budget,
    total_spent=total_spent,
    previous_month_total=previous_month_total,
    budget_left=budget_left,
    budget_percentage=budget_percentage,
    category_totals=category_totals,
    category_budget_progress=category_budget_progress,
    financial_health=financial_health,
    monthly_expenses=monthly_expenses,
    previous_month_expenses=previous_month_expenses,
    recurring_expenses=recurring_expenses,
    custom_categories=custom_categories,
    today=today,
    user_preferences=user_preferences,
)

if st.session_state.chat_open:

    with st.container(key="spendwise_chat_panel"):

        # =========================
        # FIXED COMPACT HEADER
        # =========================

        title_col, clear_col, close_col = st.columns([6, 1, 1])

        with title_col:
            st.markdown("### 🤖 Ask SpendWise")

        with clear_col:
            if st.button(
                "🧹",
                key="clear_spendwise_chat",
                help="Clear chat"
            ):
                clear_chat_history(user_id)
                st.session_state.chat_history = []
                st.rerun()

        with close_col:
            if st.button(
                "✕",
                key="close_spendwise_chat",
                help="Close chat"
            ):
                st.session_state.chat_open = False
                st.rerun()

        # =========================
        # SCROLLABLE CHAT BODY
        # =========================
        # Messages + quick actions + input all live in ONE scrollable area.
        # This guarantees the bottom controls are always reachable.

        with st.container(
            key="spendwise_chat_body",
            height=485
        ):
            if st.session_state.chat_history:
                for message in st.session_state.chat_history:
                    with st.chat_message(message["role"]):
                        st.write(message["content"])
            else:
                st.caption(
                    "No messages yet. Ask a question or use a quick prompt below."
                )

            st.divider()

            # -------------------------
            # COMPACT QUICK PROMPTS
            # -------------------------

            quick_col1, quick_col2, quick_col3, quick_col4 = st.columns(4)

            with quick_col1:
                if st.button(
                    "📊 Analyze",
                    use_container_width=True,
                    key="ai_quick_analyze"
                ):
                    st.session_state.ai_quick_prompt = (
                        "Analyze my spending this month and tell me "
                        "the most important things I should know."
                    )

            with quick_col2:
                if st.button(
                    "📈 Compare",
                    use_container_width=True,
                    key="ai_quick_compare"
                ):
                    st.session_state.ai_quick_prompt = (
                        "Compare my spending this month with last month "
                        "and explain the biggest changes."
                    )

            with quick_col3:
                if st.button(
                    "💰 Save?",
                    use_container_width=True,
                    key="ai_quick_save"
                ):
                    st.session_state.ai_quick_prompt = (
                        "Based on my actual spending, "
                        "where could I reduce expenses?"
                    )

            with quick_col4:
                if st.button(
                    "🛒 Afford?",
                    use_container_width=True,
                    key="ai_quick_afford"
                ):
                    st.session_state.ai_quick_prompt = (
                        "Based on my current budget, how much could I "
                        "reasonably afford to spend on an optional purchase?"
                    )

            quick_prompt = st.session_state.pop(
                "ai_quick_prompt",
                None
            )

            # -------------------------
            # COMPACT MESSAGE INPUT
            # -------------------------

            with st.form(
                "spendwise_chat_form",
                clear_on_submit=True
            ):
                input_col, send_col = st.columns([5.5, 1.5])

                with input_col:
                    user_message = st.text_input(
                        "Message",
                        placeholder="Ask SpendWise...",
                        label_visibility="collapsed"
                    )

                with send_col:
                    send_message = st.form_submit_button(
                        "Send",
                        use_container_width=True
                    )

        # -------------------------
        # ONE SHARED SEND PIPELINE
        # -------------------------

        message_to_send = (
            quick_prompt
            if quick_prompt
            else user_message.strip()
        )

        if message_to_send and (send_message or quick_prompt):

            with st.spinner("SpendWise is thinking..."):
                try:
                    response = ask_ai(
                        message_to_send,
                        financial_context,
                        st.session_state.chat_history
                    )

                except Exception as error:
                    error_text = str(error)

                    if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:
                        response = (
                            "⚠️ SpendWiseAI has hit its current request limit. "
                            "Please try again shortly."
                        )

                    elif "503" in error_text or "UNAVAILABLE" in error_text:
                        response = (
                            "⚠️ SpendWiseAI is temporarily unavailable. "
                            "Please try again in a moment."
                        )

                    else:
                        response = (
                            "⚠️ SpendWiseAI couldn't process that request right now. "
                            "Please try again."
                        )

            if not response or not response.strip():
                response = (
                    "I couldn't generate a response for that. "
                    "Try asking it another way."
                )

            add_chat_message(
                user_id,
                "user",
                message_to_send
            )

            add_chat_message(
                user_id,
                "assistant",
                response
            )

            st.session_state.chat_history.append({
                "role": "user",
                "content": message_to_send
            })

            st.session_state.chat_history.append({
                "role": "assistant",
                "content": response
            })

            if len(st.session_state.chat_history) > 50:
                st.session_state.chat_history = (
                    st.session_state.chat_history[-50:]
                )

            st.rerun()

# -------------------------
# FLOATING ASK SPENDWISE
# -------------------------
# FLOATING ASK SPENDWISE
# -------------------------
# FLOATING ASK SPENDWISE
# -------------------------
# FLOATING ASK SPENDWISE
# -------------------------

if not st.session_state.chat_open:
    with st.container(key="floating_chat"):

        if st.button(
            "🤖",
            key="open_spendwise_chat",
            help="Ask SpendWise"
        ):
            st.session_state.chat_open = True
            st.rerun()

# -------------------------
# MONTHLY SUMMARY PAGE
# -------------------------

if page == "monthly":

    render_monthly_summary(expenses)

    st.stop()


# -------------------------
# REPORTS PAGE
# -------------------------

if page == "reports":

    render_reports(expenses)

    st.stop()


# -------------------------
# ANALYTICS PAGE
# -------------------------

if page == "analytics":

    render_analytics(
        expenses,
        monthly_expenses,
        category_totals,
        financial_context,
        monthly_budget,
        category_budget_progress
    )

    st.stop()

# -------------------------
# DASHBOARD
# -------------------------

st.caption(
    "Your personal dashboard for tracking expenses, managing budgets, and staying in control of your finances."
)
st.divider()

with st.container(key="dashboard_metrics"):

    col1, col2, col3, col4 = st.columns(4, border=True)

    with col1:
        st.metric(
            "💸 Total Spent",
            f"₹{total_spent:.2f}"
        )

    with col2:
        st.metric(
            "💵 Budget Left",
            f"₹{budget_left:.2f}"
        )

    with col3:
        st.metric(
            "🧾 Transactions",
            len(monthly_expenses)
        )

    with col4:
        st.metric(
            "📊 Budget Used",
            f"{budget_percentage:.1f}%"
        )

if monthly_budget > 0:

    progress_value = min(
        total_spent / monthly_budget,
        1.0
    )
    st.markdown("### 📈 Monthly Budget Progress")
    st.progress(progress_value)

    st.write(
        f"₹{total_spent:.2f} spent of "
        f"₹{monthly_budget:.2f} "
        f"({budget_percentage:.1f}%)"
    )

else:
    st.info("Set a monthly budget to track your spending progress.")

if monthly_budget > 0:

    if budget_percentage < 75:
        st.success("✅ Your spending is within a healthy range.")

    elif budget_percentage < 90:
        st.warning(
            "⚠️ You have used more than 75% of your monthly budget."
        )

    elif budget_percentage <= 100:
        st.warning(
            "⚠️ You are very close to your monthly budget limit!"
        )

    else:
        exceeded_amount = total_spent - monthly_budget

        st.error(
            f"🚨 Budget exceeded by ₹{exceeded_amount:.2f}!"
        )

#-------------------------
# Financial Health Section
#-------------------------

st.subheader("🧠 Financial Health")

if not financial_health["available"]:

    st.info(financial_health["reason"])

else:
    health_score = financial_health["score"]
    health_rating = financial_health["rating"]

    st.metric(
        "Monthly Financial Health Score",
        f"{health_score}/100"
    )

    if health_score >= 90:
        st.success(f"🟢 {health_rating}")

    elif health_score >= 75:
        st.success(f"🟢 {health_rating}")

    elif health_score >= 60:
        st.warning(f"🟡 {health_rating}")

    elif health_score >= 40:
        st.warning(f"🟠 {health_rating}")

    else:
        st.error(f"🔴 {health_rating}")

if financial_health["available"]:
    with st.expander("📊 Why this score?"):

        components = financial_health["components"]

        overall = components["overall_budget_control"]
        category = components["category_budget_control"]
        consistency = components["spending_consistency"]
        headroom = components["budget_headroom"]

        st.write(
            f"**Overall Budget Control:** "
            f"{overall['score']}/{overall['max']}"
        )

        if category["score"] is None:
            st.write(
                "**Category Budget Control:** "
                "Not scored — no category budgets configured"
            )
        else:
            st.write(
                f"**Category Budget Control:** "
                f"{category['score']:.1f}/{category['max']}"
            )

        st.write(
            f"**Spending Consistency:** "
            f"{consistency['score']}/{consistency['max']}"
        )

        st.write(
            f"**Budget Headroom:** "
            f"{headroom['score']}/{headroom['max']}"
        )

        positive_factors = financial_health["positive_factors"]
        attention_factors = financial_health["attention_factors"]

        if positive_factors:
            st.markdown("#### ✅ What's helping")
            for factor in positive_factors:
                st.write(f"• {factor}")

        if attention_factors:
            st.markdown("#### ⚠️ Needs attention")
            for factor in attention_factors:
                st.write(f"• {factor}")

#-------------------------
# BUDGET SETTING
#-------------------------
budget_error = None
st.divider()
st.subheader("💵 Monthly Budget")

with st.container(key="monthly_budget_controls"):
    
    budget_col1, budget_col2, budget_col3 = st.columns(
        [3, 1, 5]
    )

    with budget_col1:
        budget_amount = st.number_input(
            "Set Monthly Budget (₹)",
            min_value=0.0,
            value=float(monthly_budget),
            step=500.0
        )

    with budget_col2:
        st.write("")
        st.write("")

        if st.button(
            "💾 Save Budget",
            key="save_budget_button"
        ):
            if budget_amount <= 0:
                budget_error = "Monthly budget must be greater than ₹0."

            else:
                set_budget(
                    user_id,
                    current_month,
                    budget_amount
                )
                st.rerun()
    if budget_error:
        st.warning(budget_error)


# -----------------------------
# CATEGORY-WISE BUDGETS
# -----------------------------

st.divider()
st.subheader("🎯 Category Budgets")

if category_budget_progress:

    for category_name, info in category_budget_progress.items():

        spent = info["spent"]
        budget = info["budget"]
        percentage = info["percentage"]

        emoji = category_icons.get(
            category_name,
            "🏷️"
        )

        st.markdown(
            f"**{emoji} {category_name}**"
        )

        st.write(
            f"₹{spent:,.0f} / ₹{budget:,.0f}"
        )

        # Streamlit progress must stay between 0 and 1
        progress_value = min(
            spent / budget,
            1.0
        )

        st.progress(progress_value)

        if percentage >= 100:
            st.error(
                f"🚨 Over budget — {percentage:.0f}% used"
            )

        elif percentage >= 80:
            st.warning(
                f"⚠️ Approaching limit — {percentage:.0f}% used"
            )

        else:
            st.caption(
                f"✅ {percentage:.0f}% used"
            )

        st.write("")

all_categories = [
    "Food",
    "Travel",
    "Shopping",
    "Education",
    "Entertainment",
    "Bills",
    "Health",
    "Other"
]

for custom_category in custom_categories:
    custom_name = custom_category["name"]

    if custom_name not in all_categories:
        all_categories.append(custom_name)


with st.expander("⚙️ Manage Category Budgets"):

    selected_budget_category = st.selectbox(
        "Category",
        all_categories,
        key="category_budget_category"
    )

    existing_budget = category_budget_map.get(
        selected_budget_category,
        0.0
    )

    category_budget_amount = st.number_input(
        "Monthly Category Budget (₹)",
        min_value=0.0,
        value=float(existing_budget),
        step=500.0,
        key=(
            f"category_budget_amount_"
            f"{selected_budget_category}_"
            f"{st.session_state.category_budget_widget_version}"
        )
    )

    save_col, delete_col, spacer = st.columns(
        [0.8, 0.8, 8.4]
    )

    with save_col:
        save_category_budget = st.button(
            "💾 Save",
            key="save_category_budget"
        )

    with delete_col:
        delete_category_budget_clicked = st.button(
            "🗑️ Delete",
            key="delete_category_budget_button"
        )


    if save_category_budget:

        if category_budget_amount <= 0:
            st.warning(
                "Category budget must be greater than ₹0."
            )

        else:
            selected_category_id = None

            for custom_category in custom_categories:
                if (
                    custom_category["name"]
                    == selected_budget_category
                ):
                    selected_category_id = custom_category["id"]
                    break

            set_category_budget(
                user_id,
                selected_budget_category,
                current_month,
                category_budget_amount,
                selected_category_id
            )

            st.success("Category budget saved!")
            st.rerun()


    if delete_category_budget_clicked:

        if selected_budget_category not in category_budget_map:
            st.info(
                "No category budget exists for this category."
            )

        else:
            delete_category_budget(
                user_id,
                selected_budget_category,
                current_month
            )
            st.session_state.category_budget_widget_version += 1

            st.rerun()

# -------------------------
# ADD EXPENSE
# -------------------------

st.divider()
st.subheader("➕ Add Expense")

with st.form("add_expense_form"):

    row1_col1, row1_col2 = st.columns(2)

    with row1_col1:
        expense_name = st.text_input(
            "Expense Name",
            placeholder="e.g. Lunch, Metro, Electricity"
        )

    with row1_col2:
        amount = st.number_input(
            "Amount (₹)",
            min_value=0.0,
            step=10.0
        )


    row2_col1, row2_col2 = st.columns(2)

    with row2_col1:
        category_options = {
            "🍔 Food": "Food",
            "🚇 Travel": "Travel",
            "🛍️ Shopping": "Shopping",
            "🎓 Education": "Education",
            "🎬 Entertainment": "Entertainment",
            "💡 Bills": "Bills",
            "❤️ Health": "Health",
            "📦 Other": "Other"
        }
        custom_category_ids = {}

        for custom_category in custom_categories:
            name = custom_category["name"]
            emoji = custom_category.get("emoji") or "🏷️"

            label = f"{emoji} {name}"

            category_options[label] = name
            custom_category_ids[name] = custom_category["id"]

        selected_category = st.selectbox(
            "Category",
            list(category_options.keys())
        )

        category = category_options[selected_category]
        selected_category_id = custom_category_ids.get(category)

    with row2_col2:
        expense_date = st.date_input(
            "Date"
        )


    description = st.text_area(
        "Description",
        placeholder="Optional note about this expense..."
    )

    submitted = st.form_submit_button(
        "➕ Add Expense"
    )


if submitted:

    if expense_name.strip() == "":
        st.warning("Please enter an expense name.")

    elif amount <= 0:
        st.warning("Expense amount must be greater than ₹0.")

    else:
        add_expense(
            user_id,
            expense_name,
            amount,
            category,
            expense_date,
            description,
            selected_category_id
        )

        st.rerun()

# -------------------------
# RECURRING EXPENSES
# -------------------------

st.divider()
st.subheader("🔁 Recurring Expenses")

with st.expander("➕ Add Recurring Expense"):

    with st.form("add_recurring_expense_form"):

        recurring_col1, recurring_col2 = st.columns(2)

        with recurring_col1:
            recurring_name = st.text_input(
                "Recurring Expense Name",
                placeholder="e.g. Netflix, Rent, Gym"
            )

        with recurring_col2:
            recurring_amount = st.number_input(
                "Recurring Amount (₹)",
                min_value=0.0,
                step=10.0
            )

        recurring_col3, recurring_col4 = st.columns(2)

        with recurring_col3:
            recurring_category_options = {
                "🍔 Food": "Food",
                "🚇 Travel": "Travel",
                "🛍️ Shopping": "Shopping",
                "🎓 Education": "Education",
                "🎬 Entertainment": "Entertainment",
                "💡 Bills": "Bills",
                "❤️ Health": "Health",
                "📦 Other": "Other"
            }

            recurring_custom_category_ids = {}

            for custom_category in custom_categories:
                name = custom_category["name"]
                emoji = custom_category.get("emoji") or "🏷️"

                label = f"{emoji} {name}"

                recurring_category_options[label] = name
                recurring_custom_category_ids[name] = custom_category["id"]

            recurring_selected_category = st.selectbox(
                "Category",
                list(recurring_category_options.keys()),
                key="recurring_category"
            )

            recurring_category = recurring_category_options[
                recurring_selected_category
            ]

            recurring_category_id = recurring_custom_category_ids.get(
                recurring_category
            )

        with recurring_col4:
            recurring_frequency = st.selectbox(
                "Frequency",
                ["weekly", "monthly", "yearly"]
            )

        recurring_start_date = st.date_input(
            "Start Date",
            key="recurring_start_date"
        )

        recurring_description = st.text_area(
            "Description",
            placeholder="Optional note about this recurring expense..."
        )

        recurring_submit = st.form_submit_button(
            "➕ Add Recurring Expense"
        )
        if recurring_submit:

            if not recurring_name.strip():
                st.error("Please enter a recurring expense name.")

            elif recurring_amount <= 0:
                st.error("Recurring amount must be greater than ₹0.")

            else:
                # Calculate the next occurrence after the start date.
                if recurring_frequency == "weekly":
                    next_run_date = recurring_start_date + timedelta(days=7)

                elif recurring_frequency == "monthly":
                    next_month = recurring_start_date.month + 1
                    next_year = recurring_start_date.year

                    if next_month > 12:
                        next_month = 1
                        next_year += 1

                    last_day = calendar.monthrange(
                        next_year,
                        next_month
                    )[1]

                    next_day = min(
                        recurring_start_date.day,
                        last_day
                    )

                    next_run_date = date(
                        next_year,
                        next_month,
                        next_day
                    )

                else:  # yearly
                    next_year = recurring_start_date.year + 1

                    try:
                        next_run_date = recurring_start_date.replace(
                            year=next_year
                        )
                    except ValueError:
                        # Handles February 29 in a non-leap year.
                        next_run_date = date(
                            next_year,
                            2,
                            28
                        )

                add_recurring_expense(
                    user_id=user_id,
                    name=recurring_name.strip(),
                    amount=recurring_amount,
                    category=recurring_category,
                    category_id=recurring_category_id,
                    description=recurring_description.strip(),
                    frequency=recurring_frequency,
                    start_date=recurring_start_date.isoformat(),
                    next_run_date=next_run_date.isoformat()
                )

                st.success(
                    f"Recurring expense '{recurring_name.strip()}' added!"
                )

                st.rerun()

if recurring_expenses:
    st.markdown("### Current Recurring Expenses")

    for recurring in recurring_expenses:
        is_active = recurring.get("is_active", True)
        status = "Active" if is_active else "Paused"

        info_col, action_col = st.columns([5, 1])

        with info_col:
            st.markdown(
                    f"""
                **{recurring['name']}**  
                ₹{float(recurring['amount']):,.2f} • {recurring['category']}  
                {recurring['frequency'].title()} • {status}  
                Next run: {recurring['next_run_date']}
                """
            )

        with action_col:
            if is_active:
                if st.button(
                    "⏸️ Pause",
                    key=f"pause_recurring_{recurring['id']}"
                ):
                    set_recurring_expense_active(
                        user_id,
                        recurring["id"],
                        False
                    )

                    st.rerun()

            else:
                if st.button(
                    "▶️ Resume",
                    key=f"resume_recurring_{recurring['id']}"
                ):
                    set_recurring_expense_active(
                        user_id,
                        recurring["id"],
                        True
                    )

                    st.rerun()
            delete_key = f"confirm_delete_recurring_{recurring['id']}"

            if delete_key not in st.session_state:
                st.session_state[delete_key] = False

            if not st.session_state[delete_key]:
                if st.button(
                    "🗑️ Delete",
                    key=f"delete_recurring_{recurring['id']}"
                ):
                    st.session_state[delete_key] = True
                    st.rerun()

            else:
                st.warning(
                    f"Delete '{recurring['name']}' permanently?"
                )

                confirm_col, cancel_col = st.columns(2)

                with confirm_col:
                    if st.button(
                        "✅ Yes",
                        key=f"confirm_delete_button_{recurring['id']}"
                    ):
                        delete_recurring_expense(
                            user_id,
                            recurring["id"]
                        )

                        del st.session_state[delete_key]

                        st.rerun()

                with cancel_col:
                    if st.button(
                        "❌ Cancel",
                        key=f"cancel_delete_recurring_{recurring['id']}"
                    ):
                        st.session_state[delete_key] = False
                        st.rerun()
        with st.expander(
            f"✏️ Edit {recurring['name']}"
        ):
            with st.form(
                f"edit_recurring_form_{recurring['id']}"
            ):
                edit_name = st.text_input(
                    "Name",
                    value=recurring["name"],
                    key=f"edit_recurring_name_{recurring['id']}"
                )

                edit_amount = st.number_input(
                    "Amount (₹)",
                    min_value=0.0,
                    value=float(recurring["amount"]),
                    step=10.0,
                    key=f"edit_recurring_amount_{recurring['id']}"
                )

                edit_category_labels = list(
                    recurring_category_options.keys()
                )

                current_category_label = next(
                    (
                        label
                        for label, name
                        in recurring_category_options.items()
                        if name == recurring["category"]
                    ),
                    edit_category_labels[0]
                )

                edit_category_label = st.selectbox(
                    "Category",
                    edit_category_labels,
                    index=edit_category_labels.index(
                        current_category_label
                    ),
                    key=f"edit_recurring_category_{recurring['id']}"
                )

                edit_category = recurring_category_options[
                    edit_category_label
                ]

                edit_category_id = recurring_custom_category_ids.get(
                    edit_category
                )

                frequency_options = [
                    "weekly",
                    "monthly",
                    "yearly"
                ]

                edit_frequency = st.selectbox(
                    "Frequency",
                    frequency_options,
                    index=frequency_options.index(
                        recurring["frequency"]
                    ),
                    key=f"edit_recurring_frequency_{recurring['id']}"
                )

                edit_start_date = st.date_input(
                    "Start Date",
                    value=date.fromisoformat(
                        recurring["start_date"]
                    ),
                    key=f"edit_recurring_start_{recurring['id']}"
                )

                edit_description = st.text_area(
                    "Description",
                    value=recurring.get("description") or "",
                    key=f"edit_recurring_description_{recurring['id']}"
                )

                edit_submit = st.form_submit_button(
                    "💾 Save Changes"
                )

                if edit_submit:

                    if not edit_name.strip():
                        st.error("Please enter a recurring expense name.")

                    elif edit_amount <= 0:
                        st.error("Recurring amount must be greater than ₹0.")

                    else:
                        if edit_frequency == "weekly":
                            edit_next_run_date = (
                                edit_start_date
                                + timedelta(days=7)
                            )

                        elif edit_frequency == "monthly":
                            next_month = edit_start_date.month + 1
                            next_year = edit_start_date.year

                            if next_month > 12:
                                next_month = 1
                                next_year += 1

                            last_day = calendar.monthrange(
                                next_year,
                                next_month
                            )[1]

                            next_day = min(
                                edit_start_date.day,
                                last_day
                            )

                            edit_next_run_date = date(
                                next_year,
                                next_month,
                                next_day
                            )

                        else:
                            next_year = edit_start_date.year + 1

                            try:
                                edit_next_run_date = (
                                    edit_start_date.replace(
                                        year=next_year
                                    )
                                )
                            except ValueError:
                                edit_next_run_date = date(
                                    next_year,
                                    2,
                                    28
                                )

                        update_recurring_expense(
                            user_id=user_id,
                            recurring_id=recurring["id"],
                            name=edit_name.strip(),
                            amount=edit_amount,
                            category=edit_category,
                            category_id=edit_category_id,
                            description=edit_description.strip(),
                            frequency=edit_frequency,
                            start_date=edit_start_date.isoformat(),
                            next_run_date=edit_next_run_date.isoformat()
                        )

                        st.success(
                            f"'{edit_name.strip()}' updated successfully!"
                        )

                        st.rerun()
        st.divider()

else:
    st.info("No recurring expenses yet.")

# -----------------------------
# MANAGE CUSTOM CATEGORIES
# -----------------------------

with st.expander("🏷️ Manage Custom Categories"):

    st.caption(
        "Create your own categories for expenses. "
        "These categories are private to your account."
    )

    # Add category
    with st.form("add_category_form"):
        category_name = st.text_input(
            "Category Name",
            placeholder="e.g. Gaming, College, Fuel"
        )

        category_emoji = st.text_input(
            "Emoji",
            placeholder="e.g. 🎮"
        )

        add_category_submit = st.form_submit_button(
            "➕ Add Category"
        )

    if add_category_submit:

        if not category_name.strip():
            st.warning("Please enter a category name.")

        else:
            try:
                add_category(
                    user_id,
                    category_name,
                    category_emoji
                )

                st.success("Category added successfully!")
                st.rerun()

            except Exception as error:

                error_text = str(error).lower()

                if "duplicate" in error_text or "unique" in error_text:
                    st.warning(
                        "You already have a category with this name."
                    )

                else:
                    st.error(
                        "Could not add this category right now."
                    )


    # Existing custom categories
    if custom_categories:

        st.divider()
        st.markdown("#### Your Categories")

        for custom_category in custom_categories:

            category_id = custom_category["id"]
            current_name = custom_category["name"]
            current_emoji = (
                custom_category.get("emoji") or "🏷️"
            )

            col1, col2, col3 = st.columns([8, 0.5, 0.5])

            with col1:
                st.write(
                    f"{current_emoji} {current_name}"
                )

            with col2:
                if st.button(
                    "✏️",
                    key=f"edit_category_{category_id}",
                    help="Edit category"
                ):
                    st.session_state[
                        "editing_category_id"
                    ] = category_id

            with col3:
                if st.button(
                    "🗑️",
                    key=f"delete_category_{category_id}",
                    help="Delete category"
                ):
                    delete_category(
                        user_id,
                        category_id
                    )

                    st.rerun()
        if st.session_state.editing_category_id == category_id:

            with st.form(f"edit_category_form_{category_id}"):

                edited_name = st.text_input(
                    "Category Name",
                    value=current_name,
                    key=f"edit_name_{category_id}"
                )

                edited_emoji = st.text_input(
                    "Emoji",
                    value=current_emoji,
                    key=f"edit_emoji_{category_id}"
                )

                save_col, cancel_col, spacer = st.columns([0.7, 0.8, 8.5])

                with save_col:
                    save_edit = st.form_submit_button("💾 Save")

                with cancel_col:
                    cancel_edit = st.form_submit_button("❌ Cancel")

            if save_edit:
                if not edited_name.strip():
                    st.warning("Category name cannot be empty.")

                else:
                    try:
                        update_category(
                            user_id,
                            category_id,
                            edited_name,
                            edited_emoji
                        )

                        st.session_state.editing_category_id = None
                        st.success("Category updated!")
                        st.rerun()

                    except Exception as error:
                        error_text = str(error).lower()

                        if "duplicate" in error_text or "unique" in error_text:
                            st.warning(
                                "You already have a category with this name."
                    )
                        else:
                            st.error(
                                "Could not update this category right now."
                            )

            if cancel_edit:
                st.session_state.editing_category_id = None
                st.rerun()      
    else:
        st.info("You haven't created any custom categories yet.")

# -------------------------
# FILTERS & SEARCH
# -------------------------

st.divider()
st.subheader("🔎 Filter & Search")

search_col, category_col = st.columns([2, 1])

default_max_amount = max(
    100000.0,
    max(
        (expense["amount"] for expense in expenses),
        default=0.0
    )
)

with search_col:
    search_text = st.text_input(
        "Search Expense",
        placeholder="Search by expense name..."
    )

with category_col:

    filter_categories = [
        "All",
        "Food",
        "Travel",
        "Shopping",
        "Education",
        "Entertainment",
        "Bills",
        "Health",
        "Other"
    ]

    for custom_category in custom_categories:
        custom_name = custom_category["name"]

        if custom_name not in filter_categories:
            filter_categories.append(custom_name)

    filter_category = st.selectbox(
        "Category",
        filter_categories
    )

date_col1, date_col2, amount_col1, amount_col2 = st.columns(4)

with date_col1:
    start_date = st.date_input(
        "From Date",
        value=date.today().replace(day=1)
    )

with date_col2:
    end_date = st.date_input(
        "To Date",
        value=date.today()
    )
if start_date > end_date:
    st.warning("From Date cannot be after To Date.")
with amount_col1:
    min_amount = st.number_input(
        "Minimum Amount (₹)",
        min_value=0.0,
        value=0.0,
        step=100.0
    )

with amount_col2:
    max_amount = st.number_input(
        "Maximum Amount (₹)",
        min_value=0.0,
        value=float(default_max_amount),
        step=100.0
    )

# Start with all expenses
filtered_expenses = expenses.copy()


# Search by expense name
if search_text:
    filtered_expenses = [
        expense
        for expense in filtered_expenses
        if search_text.lower() in expense["name"].lower()
    ]


# Filter by category
if filter_category != "All":
    filtered_expenses = [
        expense
        for expense in filtered_expenses
        if expense["category"] == filter_category
    ]


# Filter by date
filtered_expenses = [
    expense
    for expense in filtered_expenses
    if start_date <= date.fromisoformat(expense["date"]) <= end_date
]


# Filter by amount
filtered_expenses = [
    expense
    for expense in filtered_expenses
    if min_amount <= expense["amount"] <= max_amount
]

# -------------------------
# TRANSACTIONS
# -------------------------
st.caption(
    f"Showing {len(filtered_expenses)} of {len(expenses)} transactions"
)
st.divider()
st.subheader("📋 Transactions")

#-------------------------
# HEADERS 
#-------------------------

st.markdown("""
<div class="transaction-header">
    <div>EXPENSE</div>
    <div>CATEGORY</div>
    <div>AMOUNT</div>
    <div>DATE</div>
    <div>ACTIONS</div>
</div>
""", unsafe_allow_html=True)

st.markdown(
    "<hr style='margin: 4px 0 8px 0; border: none; border-top: 1px solid #3a3f4b;'>",
    unsafe_allow_html=True
)
with st.container(key="transactions_table"):

    if len(filtered_expenses) == 0:
        st.info("No expenses match the selected filters.")
    else:
        for expense in filtered_expenses:

            col1, col2, col3, col4, edit_col, delete_col = st.columns(
                [3, 2.4, 1.7, 2.2, 0.85, 0.85]
            )

            with col1:
                st.write(expense["name"])

            with col2:
                st.write(
                    f'{category_icons.get(expense["category"], "📦")} '
                    f'{expense["category"]}'
                )

            with col3:
                st.write(f"₹{expense['amount']:.2f}")

            with col4:
                formatted_date = date.fromisoformat(
                    expense["date"]
                ).strftime("%d %b %Y")

                st.write(formatted_date)

            with edit_col:
                if st.button(
                    "✏️",
                    key=f'edit_{expense["id"]}',
                    help="Edit expense"
                ):
                    st.session_state.editing_id = expense["id"]
                    st.rerun()

            with delete_col:
                if st.button(
                    "🗑️",
                    key=f'delete_{expense["id"]}',
                    help="Delete expense"
                ):
                    delete_expense(
                        user_id,
                        expense["id"]
                    )
                    st.rerun()

# -------------------------
# EDIT EXPENSE
# -------------------------

if st.session_state.editing_id is not None:

    expense = next(
        (
            item for item in expenses
            if item["id"] == st.session_state.editing_id
        ),
        None
    )

    if expense is not None:

        st.divider()
        st.subheader("✏️ Edit Expense")

        edited_name = st.text_input(
            "Edit Name",
            value=expense["name"]
        )

        edited_amount = st.number_input(
            "Edit Amount (₹)",
            min_value=0.0,
            value=float(expense["amount"]),
            step=10.0
        )

        categories = [
            "Food",
            "Travel",
            "Shopping",
            "Education",
            "Entertainment",
            "Bills",
            "Health",
            "Other"
        ]

        for custom_category in custom_categories:
            custom_name = custom_category["name"]

            if custom_name not in categories:
                categories.append(custom_name)

        edited_category = st.selectbox(
            "Edit Category",
            categories,
            index=categories.index(expense["category"])
        )

        # SQLite returns the date as text, so convert it back to a date object.
        stored_date = date.fromisoformat(expense["date"])

        edited_date = st.date_input(
            "Edit Date",
            value=stored_date
        )

        edited_description = st.text_input(
            "Edit Description",
            value=expense["description"] or ""
        )


        edited_category_id = None

        for custom_category in custom_categories:
            if custom_category["name"] == edited_category:
                edited_category_id = custom_category["id"]
                break
        button_col1, button_col2, empty_space = st.columns([1, 1, 6.5])
        edit_error = None
        with button_col1:
            if st.button("💾 Save Changes"):

                if edited_name.strip() == "":
                    edit_error = "Please enter an expense name."

                elif edited_amount <= 0:
                    edit_error = "Expense amount must be greater than ₹0."

                else:
                    update_expense(
                        user_id,
                        st.session_state.editing_id,
                        edited_name,
                        edited_amount,
                        edited_category,
                        edited_date,
                        edited_description,
                        edited_category_id
                    )

                    st.session_state.editing_id = None
                    st.rerun()

        with button_col2:
            if st.button("❌ Cancel"):
                st.session_state.editing_id = None
                st.rerun()
        if edit_error:
            st.warning(edit_error)

