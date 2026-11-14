# SpendWise AI — Web Frontend

The Next.js 16 frontend for SpendWise AI. It talks to the same Supabase project
as the Python/Streamlit app, so accounts and financial data are shared between
both clients.

This app is a work in progress: authentication, the dashboard, transactions,
budgets, and categories use live Supabase data, while the remaining pages are
still UI prototypes backed by mock data.

## Requirements

- Node.js 20.9 or newer (developed on Node 24)
- npm 10 or newer
- Access to the SpendWise Supabase project

## Setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Create `frontend/.env.local` with the project's public Supabase credentials:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

   Copy these values from the Streamlit app's `.streamlit/secrets.toml`
   (`SUPABASE_URL` and `SUPABASE_KEY`). The key used by the web app must be the
   public/publishable key — never the service-role key, because anything
   prefixed with `NEXT_PUBLIC_` is shipped to the browser.

   `.env.local` is gitignored. Do not commit it.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000>. You will be redirected to `/login`; sign in
   with an existing SpendWise account.

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Development server with hot reload   |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | ESLint                               |

## Authentication

- Sessions are cookie-based and managed with `@supabase/ssr`.
- `src/proxy.ts` refreshes the session on every request and redirects
  unauthenticated visitors to `/login?next=<path>`.
- `/login` and `/auth/*` are the only public routes. Signed-in users visiting
  `/login` are sent to `/dashboard`.
- Sign-in and sign-up are Server Actions in `src/app/login/actions.ts`.
- Sign-out is a POST to `/auth/signout`.
- Email confirmation links are exchanged for a session at `/auth/callback`.

For sign-up to work in a deployed environment, add
`<your-domain>/auth/callback` to the Supabase dashboard under
**Authentication → URL Configuration → Redirect URLs**. For local development
using the default port, add `http://localhost:3000/auth/callback`.

## Data access

Supabase clients live in `src/lib/supabase/`:

- `server.ts` — request-scoped client for Server Components, Server Actions and
  Route Handlers. Use this for all data access.
- `client.ts` — browser client for future client-side features.
- `proxy.ts` — session refresh and route protection used by `src/proxy.ts`.
- `env.ts` — reads and validates the required environment variables.

Data access is authorized twice: Supabase Row Level Security on the database,
plus explicit `.eq("user_id", user.id)` filters in queries.

`src/lib/data/dashboard.ts` fetches the current month's expenses, the monthly
budget, and user settings, then aggregates daily and category totals and
calculates the Financial Health Score (`src/lib/finance.ts`). The scoring and
month-key format (`YYYY-MM`) mirror the Python app so both clients agree.

`src/lib/data/transactions.ts` powers the month view on `/transactions`, with
URL-driven filters (`?month=YYYY-MM&category=…&q=…`). Server Actions in
`src/app/transactions/actions.ts` create, update, and delete expenses; every
write re-checks the session and scopes the query with `.eq("user_id", …)`, then
revalidates `/transactions` and `/dashboard`.

`src/lib/data/budgets.ts` and `src/app/budgets/actions.ts` power `/budgets`.
They read the selected month's overall budget, category budgets, and expenses,
then show spend-vs-budget progress. Writes upsert `budgets` on
`(user_id, month)` and `category_budgets` on
`(user_id, category_name, month)`, matching the Python app. The "Copy last
month" action duplicates both plans into the selected month.

`src/lib/data/categories.ts` and `src/app/categories/actions.ts` power
`/categories`. Built-in categories are always available; custom ones can be
created, renamed, and deleted. Renaming syncs linked expenses and category
budgets. Deleting moves linked expenses to `Other` and removes their category
budgets, mirroring `cloud_db.py`.

The Financial Health Score in `src/lib/finance.ts` now includes category-budget
scoring (25 of 100 points) when category budgets exist, and redistributes those
points when they do not — the same behavior as `financial_health.py`.

### Supabase tables used

`expenses`, `budgets`, `categories`, `category_budgets`, `recurring_expenses`,
`chat_history`, `user_settings`.

## Status

| Area                    | Status                       |
| ----------------------- | ---------------------------- |
| Auth (login/signup/out) | Live Supabase                |
| Dashboard               | Live Supabase                |
| Transactions            | Live Supabase (CRUD)         |
| Budgets                 | Live Supabase (CRUD)         |
| Categories              | Live Supabase (CRUD)         |
| Goals, Bills            | Mock data                    |
| Analytics, Reports      | Mock data                    |
| Recurring               | Mock data                    |
| Import                  | Mock data                    |
| SpendWise AI            | Mock data                    |
| Settings                | Mock data                    |

## Project structure

```
src/
  app/            routes (App Router), login and auth handlers
  components/
    spendwise/    app shell, dashboard UI pieces
    ui/           shadcn/base-ui primitives
  lib/
    data/         Supabase-backed query modules
    supabase/     Supabase clients, proxy helpers, env validation
    finance.ts    currency formatting and Financial Health Score
  proxy.ts        Next.js proxy (session refresh + route guard)
```
