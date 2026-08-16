# 💰 SpendWise AI

SpendWise AI is an AI-powered personal expense management system built
with Streamlit, SQLite, and Google Gemini.

It helps users track expenses, manage monthly budgets, analyze spending
patterns, generate reports, and receive AI-powered financial insights.

## 🌐 Live Demo

Try SpendWise AI here:

[Open SpendWise AI](https://spend-wiseai.streamlit.app/)

## ✨ Features

-   Add, edit, and delete expenses
-   Monthly budget tracking
-   Spending progress and budget alerts
-   Expense filtering and search
-   Category-based spending analytics
-   Daily spending trends
-   Monthly spending summary
-   Previous-month comparison
-   CSV expense export
-   PDF expense reports
-   AI-powered spending insights
-   AI saving recommendations
-   Floating Ask SpendWise chatbot
-   Persistent AI chat history
-   Responsive dashboard interface

## 🛠️ Technologies Used

-   Python
-   Streamlit
-   SQLite
-   Pandas
-   Altair
-   ReportLab
-   Google Gemini API
-   python-dateutil

## 📁 Project Structure

``` text
SpendWise-AI/
├── .streamlit/
│   └── secrets.toml
├── LICENSE
├── LICENSE-MIT-v1.0
├── .gitignore
├── ai.py
├── analytics.py
├── app.py
├── db.py
├── monthly_summary.py
├── reports.py
├── requirements.txt
```

## 🚀 Installation

Clone the repository:

``` bash
git clone https://github.com/syed-saifuddin7/SpendWise-AI.git
cd SpendWise-AI
```

Install the required dependencies:

``` bash
pip install -r requirements.txt
```

Create:

``` text
.streamlit/secrets.toml
```

and add your Gemini API key:

``` toml
GEMINI_API_KEY = "your_api_key_here"
```

Run SpendWise AI:

``` bash
python -m streamlit run app.py
```

## 🔐 Security

API keys are stored in `.streamlit/secrets.toml`.

The secrets file is excluded from Git using `.gitignore` and should
never be committed to a public repository.

## 📊 Database

SpendWise AI uses SQLite for local data storage.

The application automatically creates the required database tables for:

-   Expenses
-   Monthly budgets
-   AI chat history

## 🤖 SpendWiseAI

SpendWiseAI uses Google Gemini to provide:

-   Spending analysis
-   Saving recommendations
-   Expense-related Q&A
-   Budget guidance

AI responses use the financial data stored in SpendWise AI and are
designed not to invent missing transactions or values.

## 📄 Reports

Users can export monthly expense data as:

-   CSV
-   PDF

## 📌 Version

**SpendWise AI v1.0.0**

## 👨‍💻 Author

**Syed Saifuddin**

## 📜 License

SpendWise AI is licensed under the **PolyForm Noncommercial License 1.0.0**.

You are welcome to:

- ✅ View and download the source code
- ✅ Fork and modify the project
- ✅ Experiment with it and use it for learning
- ✅ Run modified versions locally
- ✅ Host modified versions for noncommercial purposes

You may not:

- ❌ Use SpendWise AI for commercial purposes
- ❌ Sell or monetize SpendWise AI or modified versions of it
- ❌ Remove the required copyright and license notices

For the complete licensing terms, see the [LICENSE](LICENSE) file.

> **Note:** SpendWise AI v1.0.0 was originally released under the MIT License. See [LICENSE-MIT-v1.0](LICENSE-MIT-v1.0) for the license applicable to that release.