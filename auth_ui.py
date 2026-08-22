import streamlit as st
from auth import sign_up, sign_in


def render_signup():
    st.subheader("📝 Create Account")

    with st.form("signup_form"):

        email = st.text_input(
            "Email",
            placeholder="you@example.com"
        )

        password = st.text_input(
            "Password",
            type="password",
            placeholder="Minimum 8 characters"
        )

        confirm_password = st.text_input(
            "Confirm Password",
            type="password"
        )

        submitted = st.form_submit_button(
            "Create Account"
        )

    if submitted:

        if not email.strip():
            st.warning("Please enter your email address.")
            return

        if len(password) < 8:
            st.warning("Password must be at least 8 characters long.")
            return

        if password != confirm_password:
            st.warning("Passwords do not match.")
            return

        try:
            response = sign_up(
                email.strip(),
                password
            )

            if response.user:
                st.success(
                    "Account created successfully! "
                    "Check your email and confirm your account before logging in."
                )

            else:
                st.warning(
                    "Account creation did not complete. "
                    "Please try again."
                )

        except Exception as error:

            error_text = str(error).lower()

            if "already registered" in error_text or "already exists" in error_text:
                st.warning("An account with this email already exists.")

            elif "rate limit" in error_text:
                st.warning(
                    "Too many signup emails were requested. "
                    "Please wait a while and try again."
                )

            else:
                st.error(
                    "Could not create your account right now."
                )

def render_login():
    st.subheader("🔐 Login")

    with st.form("login_form"):

        email = st.text_input(
            "Email",
            placeholder="you@example.com"
        )

        password = st.text_input(
            "Password",
            type="password"
        )

        submitted = st.form_submit_button(
            "Login"
        )

    if submitted:

        if not email.strip():
            st.warning("Please enter your email address.")
            return

        if not password:
            st.warning("Please enter your password.")
            return

        try:
            response = sign_in(
                email.strip(),
                password
            )

            if response.user and response.session:
                st.session_state.auth_user = {
                    "id": response.user.id,
                    "email": response.user.email
                }
                st.session_state.access_token = (
                    response.session.access_token
                )
                st.session_state.refresh_token = (
                    response.session.refresh_token
                )
                st.success("Login successful!")
                st.rerun()
            else:
                st.warning(
                    "Login did not complete. "
                    "Please check your email and password."
                )

        except Exception as error:

            error_text = str(error).lower()

            if "email not confirmed" in error_text:
                st.warning(
                    "Please confirm your email before logging in."
                )

            elif "invalid login credentials" in error_text:
                st.warning(
                    "Incorrect email or password."
                )

            else:
                st.error(
                    "Could not log you in right now."
                )

