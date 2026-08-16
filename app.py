import streamlit as st
from db import (
    create_database,
    add_expense,
    get_expenses,
    update_expense,
    delete_expense,
    set_budget,
    get_budget,
    add_chat_message,
    get_chat_history,
    clear_chat_history
)
from datetime import date
from ai import ask_ai
from monthly_summary import render_monthly_summary
from reports import render_reports
from analytics import render_analytics

create_database()

# Load all expenses from SQLite
expenses = get_expenses()

current_month = date.today().strftime("%Y-%m")
monthly_expenses = [
    expense
    for expense in expenses
    if expense["date"].startswith(current_month)
]
monthly_budget = get_budget(current_month)

# We only keep UI state in Session State.
# The actual expense data now comes from SQLite.
if "editing_id" not in st.session_state:
    st.session_state.editing_id = None
if "chat_history" not in st.session_state:
    st.session_state.chat_history = get_chat_history()
if "ai_insights" not in st.session_state:
    st.session_state.ai_insights = None
if "ai_recommendations" not in st.session_state:
    st.session_state.ai_recommendations = None
if "chat_open" not in st.session_state:
    st.session_state.chat_open = False

st.set_page_config(
    page_title="SpendWise AI",
    page_icon="💰",
    layout="wide"
)
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
        right: 28px;
        bottom: 105px;
        width: 390px;
        max-height: 520px;
        overflow-y: auto;
        background: #0e1117;
        border: 1px solid #3a3f4b;
        border-radius: 18px;
        padding: 18px;
        z-index: 9998;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.45);
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
</style>
""", unsafe_allow_html=True)

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
    right: auto;
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
    category_totals[category] += expense["amount"]

st.title("💰 SpendWise AI")

#-------------------------
# Financial Context for AI
#-------------------------

category_context = "\n".join(
    f"- {category}: ₹{amount:.2f}"
    for category, amount in category_totals.items()
)

financial_context = f"""
CURRENT FINANCIAL SUMMARY

Month: {current_month}
Monthly Budget: ₹{monthly_budget:.2f}
Total Spent: ₹{total_spent:.2f}
Budget Remaining: ₹{budget_left:.2f}
Budget Used: {budget_percentage:.1f}%

CATEGORY SPENDING
{category_context}

Number of Transactions: {len(monthly_expenses)}
"""

#-------------------------
# AI CHAT PANEL
#-------------------------

# -------------------------
# SPENDWISE AI FINANCIAL CONTEXT
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
    financial_context += "\n- No transactions recorded this month."

if st.session_state.chat_open:

    with st.container(key="spendwise_chat_panel"):

        title_col, clear_col, close_col = st.columns([5, 1, 1])

        with title_col:
            st.markdown("### 🤖 Ask SpendWise")

        with clear_col:
            if st.button(
                "🧹",
                key="clear_spendwise_chat",
                help="Clear chat"
            ):
                clear_chat_history()
                st.session_state.chat_history = []
                st.rerun()

        with close_col:
            if st.button(
                "✕",
                key="close_spendwise_chat"
            ):
                st.session_state.chat_open = False
                st.rerun()

        st.caption(
            "Ask anything about budgeting or personal expenses."
        )

        st.divider()


        # Display previous messages
        for message in st.session_state.chat_history:

            with st.chat_message(message["role"]):
                st.write(message["content"])


        # Message input
        with st.form(
            "spendwise_chat_form",
            clear_on_submit=True
        ):

            user_message = st.text_input(
                "Message",
                placeholder="Ask SpendWise...",
                label_visibility="collapsed"
            )

            send_message = st.form_submit_button(
                "Send ➤"
            )


        # Send to Gemini
        if send_message and user_message.strip():

            with st.spinner("SpendWise is thinking..."):

                try:
                    response = ask_ai(
                        user_message,
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
            add_chat_message("user", user_message)
            add_chat_message("assistant", response)

            st.session_state.chat_history.append({
                "role": "user",
                "content": user_message
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

with st.container(key="floating_chat"):

    if st.button(
        "🤖",
        key="open_spendwise_chat",
        help="Ask SpendWise"
    ):
        st.session_state.chat_open = not st.session_state.chat_open
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
        monthly_expenses,
        category_totals,
        financial_context
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
                current_month,
                budget_amount
                )
                st.rerun()
    if budget_error:
        st.warning(budget_error)

#-------------------------
# CATEGORY ICONS
#-------------------------

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

        selected_category = st.selectbox(
            "Category",
            list(category_options.keys())
        )

        category = category_options[selected_category]

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
            expense_name,
            amount,
            category,
            expense_date,
            description
        )

        st.rerun()

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
    filter_category = st.selectbox(
        "Category",
        [
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
                    delete_expense(expense["id"])
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
                        st.session_state.editing_id,
                        edited_name,
                        edited_amount,
                        edited_category,
                        edited_date,
                        edited_description
                    )

                    st.session_state.editing_id = None
                    st.rerun()

        with button_col2:
            if st.button("❌ Cancel"):
                st.session_state.editing_id = None
                st.rerun()
        if edit_error:
            st.warning(edit_error)

