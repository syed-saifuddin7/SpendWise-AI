# 💰 SpendWise AI

SpendWise AI is a cloud-connected, AI-powered personal finance and expense management application built with Python, Streamlit, Supabase, and Google Gemini.

It helps users securely track expenses, manage budgets, understand spending patterns, automate recurring expenses, import and export financial data, and interact with their finances through SpendWiseAI.

## 🌐 Live Demo

Try SpendWise AI here:

[Open SpendWise AI](https://spend-wiseai.streamlit.app/)

## ✨ What's in v1.1

- Supabase email/password authentication
- Per-user cloud data isolation with Row Level Security (RLS)
- Cross-device cloud synchronization
- Add, edit, and delete expenses
- Monthly budget tracking and budget alerts
- Custom expense categories
- Per-category budgets and progress tracking
- Recurring expenses with automatic due-expense processing
- Financial Health Score
- Expense filtering and search
- Analytics dashboard with category and spending trends
- Monthly spending summaries and previous-month comparisons
- CSV expense import with validation and duplicate handling
- CSV and PDF reporting/export features
- SpendWiseAI powered by Google Gemini
- AI-powered financial Q&A and spending insights
- AI-assisted expense CRUD actions with confirmation safeguards
- Persistent per-user AI chat history
- User settings including profile and currency preferences
- Personal data export
- Account deletion workflow
- Responsive Streamlit interface

## 🛠️ Technology Stack

- **Python** — application and financial logic
- **Streamlit** — web application UI
- **Supabase** — authentication and PostgreSQL cloud database
- **PostgreSQL Row Level Security** — per-user data isolation
- **Google Gemini (`google-genai`)** — SpendWiseAI
- **Pandas** — data processing
- **Altair** — analytics visualizations
- **ReportLab** — PDF reports
- **python-dateutil** — recurring-date calculations

## ☁️ Cloud Data Model

The active v1.1 application uses Supabase as its source of truth. User-scoped data includes:

- Expenses
- Monthly budgets
- Custom categories
- Category budgets
- Recurring expenses
- AI chat history
- User settings

Supabase RLS policies restrict these records to the authenticated account. This allows the same account to access its data across supported devices while keeping different users isolated.

> `db.py` and `spendwise.db` belong to the earlier local SQLite implementation and are retained only as legacy/reference files. They are not the active v1.1 data source.

## 📁 Project Structure

```text
SpendWise-AI/
├── .streamlit/
│   └── config.toml
├── static/
│   ├── icon-192.png
│   └── icon-512.png
├── ai.py
├── ai_actions.py
├── ai_context.py
├── analytics.py
├── app.py
├── auth.py
├── auth_ui.py
├── cloud_db.py
├── csv_import.py
├── db.py                    # Legacy SQLite implementation
├── financial_health.py
├── monthly_summary.py
├── reports.py
├── settings.py
├── supabase_client.py
├── requirements.txt
├── LICENSE
└── LICENSE-MIT-v1.0
```

## 🚀 Local Installation

Clone the repository:

```bash
git clone https://github.com/syed-saifuddin7/SpendWise-AI.git
cd SpendWise-AI
```

Create and activate a virtual environment (recommended), then install dependencies:

```bash
pip install -r requirements.txt
```

Create the local secrets file:

```text
.streamlit/secrets.toml
```

Add your own credentials using the secret names expected by the application:

```toml
SUPABASE_URL = "your_supabase_project_url"
SUPABASE_KEY = "your_supabase_publishable_key"
GEMINI_API_KEY = "your_gemini_api_key"
```

The Supabase project must also contain the tables and RLS policies expected by the application.

Run SpendWise AI:

```bash
python -m streamlit run app.py
```

## 🔐 Security

SpendWise AI v1.1 uses Supabase Auth and database-level Row Level Security for account isolation.

Security measures include:

- User-owned records protected by authenticated `user_id`
- RLS policies for user-facing cloud tables
- CRUD operations scoped to the authenticated user
- AI actions routed through the same ownership-aware data layer
- Sensitive secrets stored outside source code
- `.streamlit/secrets.toml` excluded from Git
- Account data export scoped to the signed-in user
- Authenticated account deletion workflow

Never commit API keys, passwords, service-role keys, or `secrets.toml` to the repository.

## 🤖 SpendWiseAI

SpendWiseAI uses Google Gemini together with the signed-in user's SpendWise financial context to provide features such as:

- Spending analysis
- Budget guidance
- Saving recommendations
- Expense-related Q&A
- Financial summaries
- Assisted expense creation, editing, and deletion

Destructive or sensitive AI actions use confirmation safeguards, and AI history is stored per user in the cloud.

## 📊 Analytics & Financial Health

SpendWise provides visual analytics for spending behavior and includes a Financial Health Score derived from budgeting and spending signals available in the application.

Users can also review monthly summaries, category-level spending, trends, and previous-month comparisons.

## 📥 CSV Import & 📄 Reports

SpendWise supports CSV expense import with validation before records are written to the cloud database. Reporting/export functionality includes CSV and PDF outputs as well as a personal-data export from Settings.

## 🔄 Cross-Device Sync

Because Supabase is the v1.1 source of truth, the same authenticated account can access its SpendWise data from multiple devices. Changes become visible on another active Streamlit session after it refreshes/reruns.

Real-time push synchronization is not part of v1.1.

## 🗺️ Roadmap

The current v1.1 release remains on Streamlit. A future major version is planned to migrate SpendWise to a modern dedicated frontend while preserving the proven Supabase/cloud and security foundation where appropriate.

Planned future work includes:

- Dedicated modern frontend
- Deeper UI/UX redesign and mobile-first experience
- Proper installable PWA support
- Improved client-side session persistence
- Reduced dependence on Streamlit's rerun model

## 📌 Version

**SpendWise AI v1.1.0**

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
