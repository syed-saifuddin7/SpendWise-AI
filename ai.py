import streamlit as st
from google import genai
MODEL_NAME = "gemini-3.5-flash-lite"
SYSTEM_PROMPT = """
You are SpendWiseAI, the intelligent personal finance assistant built into
the SpendWise AI Expense Management System.

Your identity:
- Your name is SpendWiseAI.
- Always introduce yourself as SpendWiseAI when asked who you are.
- Do not introduce yourself as Gemini, Google Gemini, ChatGPT, or any other AI assistant.
- You are the built-in AI assistant of SpendWise AI.

Your purpose:
- Help users understand their expenses.
- Help users manage their monthly budget.
- Analyze spending habits.
- Give practical saving suggestions.
- Explain financial information clearly.
- Help users make smarter spending decisions.

Your personality:
- Angry and rude.
- Sarcastic and witty.
- Playful and humorous.
- Concise and conversational.
- Helpful without sounding robotic.
- Focus primarily on personal finance and expense management.

If asked "Who are you?", respond naturally along the lines of:
"I'm SpendWiseAI, your personal finance assistant. I can help you understand
your spending, manage your budget, and make smarter financial decisions."

Do not claim capabilities you do not actually have.
"""
def get_client():
    return genai.Client(
        api_key=st.secrets["GEMINI_API_KEY"]
    )

def ask_ai(message, financial_context="", chat_history=None):
    client = get_client()
    if chat_history is None:
        chat_history = []

    history_text = "\n".join(
        f"{item['role'].upper()}: {item['content']}"
        for item in chat_history[-10:]
    )
    prompt = f"""
    {SYSTEM_PROMPT}

    CURRENT USER FINANCIAL DATA:
    {financial_context}

    RECENT CONVERSATION:
     {history_text}

    IMPORTANT:
    Use the financial data above when the user asks about their expenses,
    budget, categories, transactions, spending habits, or savings.

    Never invent transactions or financial values that are not present
    in the provided data.

    If the required information is not available, clearly tell the user.

    User message:
    {message}
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )

    return response.text

def generate_insights(financial_context):

    prompt = f"""
    {SYSTEM_PROMPT}

    CURRENT USER FINANCIAL DATA:
    {financial_context}

    TASK:
    Analyze the user's current monthly financial situation.

    Give exactly 3 short insights.

    Focus on:
        - budget usage
        - highest spending categories
        - unusual or notable spending patterns
        - remaining budget

    Do not invent any values.
    Use only the financial data provided.

    Keep the response concise and easy to read.
    Do not introduce yourself.

    Format:
    1. ...
    2. ...
    3. ...
    """

    client = get_client()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )

    return response.text

def generate_recommendations(financial_context):

    prompt = f"""
{SYSTEM_PROMPT}

CURRENT USER FINANCIAL DATA:
{financial_context}

TASK:
Give exactly 3 practical saving recommendations based on the user's
current monthly spending.

Requirements:
- Use only the financial data provided.
- Focus on categories where reducing spending is realistically possible.
- Do not recommend cutting essential expenses like bills, health, or education
  unless there is a clear reason.
- Prefer actionable suggestions.
- Mention specific categories and amounts where appropriate.
- Do not invent values.
- Keep each recommendation concise.

Format:
1. ...
2. ...
3. ...
"""

    client = get_client()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )

    return response.text