import json
from datetime import datetime, timezone

import streamlit as st

from cloud_db import (
    clear_chat_history,
    create_user_settings,
    delete_own_account,
    export_user_data,
    get_user_settings,
    update_user_settings,
)
from auth import sign_out

CURRENCIES = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "AED": "AED ",
    "SGD": "S$",
}
AI_STYLES = ["Concise", "Balanced", "Detailed"]


def currency_symbol(code):
    return CURRENCIES.get(code or "INR", code or "INR")


def ensure_user_settings(user_id):
    settings = get_user_settings(user_id)
    if settings:
        return settings
    return create_user_settings(user_id)


def _clear_ai_session_state():
    for key in (
        "chat_history", "last_ai_expense", "pending_ai_action",
        "pending_ai_ambiguity", "selected_ai_ambiguity_id",
        "ai_insights", "ai_recommendations",
    ):
        st.session_state.pop(key, None)
    st.session_state.ai_action_confirmed = False


def render_settings(user_id, auth_user, current_month, monthly_budget):
    st.divider()
    st.title("⚙️ Settings")
    st.caption("Manage your SpendWise profile, financial preferences, AI experience, and account data.")

    settings = ensure_user_settings(user_id) or {}
    email = auth_user.get("email", "") if isinstance(auth_user, dict) else ""

    profile_tab, finance_tab, ai_tab, account_tab = st.tabs([
        "👤 Profile", "💰 Finance", "🤖 AI Preferences", "🔐 Account & Data"
    ])

    with profile_tab:
        st.subheader("Profile")
        display_name = st.text_input(
            "Display name",
            value=settings.get("display_name") or "",
            max_chars=80,
            key="settings_display_name",
        )
        st.text_input("Email", value=email, disabled=True, key="settings_email")
        st.caption("Your email is managed by your authenticated Supabase account.")

        if st.button("💾 Save Profile", key="save_profile_settings"):
            update_user_settings(
                user_id,
                display_name=display_name.strip() or None,
                currency=settings.get("currency", "INR"),
                default_monthly_budget=settings.get("default_monthly_budget", 0),
                ai_response_style=settings.get("ai_response_style", "Balanced"),
                ai_proactive_tips=settings.get("ai_proactive_tips", True),
            )
            st.success("Profile updated.")
            st.rerun()

    with finance_tab:
        st.subheader("Financial Preferences")
        currency_codes = list(CURRENCIES)
        current_currency = settings.get("currency", "INR")
        if current_currency not in currency_codes:
            current_currency = "INR"

        selected_currency = st.selectbox(
            "Currency",
            currency_codes,
            index=currency_codes.index(current_currency),
            format_func=lambda code: f"{code} ({CURRENCIES[code].strip()})",
            key="settings_currency",
        )
        default_budget = st.number_input(
            "Default monthly budget",
            min_value=0.0,
            value=float(settings.get("default_monthly_budget") or monthly_budget or 0),
            step=500.0,
            key="settings_default_budget",
            help=(
                "Used automatically when a new month has no monthly budget yet. "
                "Changing this does not modify an existing month's budget."
            ),
        )

        if st.button("💾 Save Finance Preferences", key="save_finance_settings"):
            update_user_settings(
                user_id,
                display_name=settings.get("display_name"),
                currency=selected_currency,
                default_monthly_budget=default_budget,
                ai_response_style=settings.get("ai_response_style", "Balanced"),
                ai_proactive_tips=settings.get("ai_proactive_tips", True),
            )
            st.success("Financial preferences updated.")
            st.rerun()

    with ai_tab:
        st.subheader("AI Preferences")
        current_style = settings.get("ai_response_style", "Balanced")
        if current_style not in AI_STYLES:
            current_style = "Balanced"

        response_style = st.selectbox(
            "Response style",
            AI_STYLES,
            index=AI_STYLES.index(current_style),
            key="settings_ai_style",
        )
        proactive_tips = st.toggle(
            "Allow proactive spending tips",
            value=bool(settings.get("ai_proactive_tips", True)),
            key="settings_ai_tips",
        )

        if st.button("💾 Save AI Preferences", key="save_ai_settings"):
            update_user_settings(
                user_id,
                display_name=settings.get("display_name"),
                currency=settings.get("currency", "INR"),
                default_monthly_budget=settings.get("default_monthly_budget", 0),
                ai_response_style=response_style,
                ai_proactive_tips=proactive_tips,
            )
            st.success("AI preferences updated.")
            st.rerun()

        st.divider()
        st.markdown("#### Clear AI chat history")
        st.caption("This permanently removes your saved SpendWise AI conversation history.")
        confirm_clear = st.checkbox(
            "I understand that my saved AI chat history will be deleted.",
            key="confirm_clear_ai_history",
        )
        if st.button(
            "🧹 Clear AI History",
            disabled=not confirm_clear,
            key="settings_clear_ai_history",
        ):
            clear_chat_history(user_id)
            _clear_ai_session_state()
            st.success("AI chat history cleared.")
            st.rerun()

    with account_tab:
        st.subheader("Export My Data")
        st.caption("Download a JSON copy of your SpendWise data. The export is scoped to your authenticated account.")
        export_data = export_user_data(user_id)
        export_data["account"] = {
            "user_id": user_id,
            "email": email,
        }
        export_payload = json.dumps(export_data, indent=2, default=str).encode("utf-8")
        st.download_button(
            "⬇️ Export My Data",
            data=export_payload,
            file_name=f"spendwise-export-{datetime.now(timezone.utc).date().isoformat()}.json",
            mime="application/json",
            key="settings_export_data",
        )

        st.divider()
        st.markdown("#### Session")
        if st.button("🚪 Logout", key="settings_logout"):
            sign_out()
            st.query_params.clear()
            st.rerun()

        st.divider()
        st.markdown("#### ⚠️ Delete Account")
        st.warning("This permanently deletes your SpendWise account and associated data. This cannot be undone.")
        delete_phrase = st.text_input(
            'Type DELETE MY ACCOUNT to continue',
            key="delete_account_phrase",
        )
        delete_confirm = st.checkbox(
            "I understand this action is permanent.",
            key="delete_account_checkbox",
        )
        can_delete = delete_confirm and delete_phrase.strip() == "DELETE MY ACCOUNT"
        if st.button(
            "🗑️ Permanently Delete Account",
            disabled=not can_delete,
            type="primary",
            key="settings_delete_account",
        ):
            try:
                delete_own_account(user_id)
            except Exception as exc:
                st.error(f"Account deletion failed safely: {exc}")
            else:
                for key in list(st.session_state.keys()):
                    del st.session_state[key]
                st.query_params.clear()
                st.rerun()
