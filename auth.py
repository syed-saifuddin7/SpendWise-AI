from supabase_client import get_supabase_client

def sign_up(email, password):
    supabase = get_supabase_client()

    response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })

    return response


def sign_in(email, password):
    supabase = get_supabase_client()

    response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })

    return response


def sign_out():
    import streamlit as st

    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()

    finally:
        st.session_state.pop("auth_user", None)
        st.session_state.pop("access_token", None)
        st.session_state.pop("refresh_token", None)
        st.session_state.pop("auth_session", None)

def get_current_user():
    supabase = get_supabase_client()

    response = supabase.auth.get_user()

    if response and response.user:
        return response.user

    return None


def get_current_session():
    supabase = get_supabase_client()

    response = supabase.auth.get_session()

    return response

def is_logged_in():
    import streamlit as st

    return (
        "auth_user" in st.session_state
        and "access_token" in st.session_state
        and "refresh_token" in st.session_state
    )