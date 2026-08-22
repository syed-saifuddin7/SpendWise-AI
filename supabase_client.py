import streamlit as st
from supabase import create_client


def get_supabase_client():
    url = st.secrets["SUPABASE_URL"]
    key = st.secrets["SUPABASE_KEY"]

    supabase = create_client(url, key)

    # Restore the logged-in user's Supabase session on every Streamlit rerun.
    access_token = st.session_state.get("access_token")
    refresh_token = st.session_state.get("refresh_token")

    if access_token and refresh_token:
        try:
            supabase.auth.set_session(
                access_token,
                refresh_token
            )
        except Exception:
            # If the stored session is invalid/expired,
            # clear it instead of leaving a broken login state.
            st.session_state.pop("access_token", None)
            st.session_state.pop("refresh_token", None)
            st.session_state.pop("auth_user", None)

    return supabase