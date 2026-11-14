import {
  Bot,
  Database,
  Download,
  LogOut,
  Repeat2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";

import { Section } from "@/components/spendwise/ui";
import type { SettingsData } from "@/lib/data/settings";
import { formatExpenseDate } from "@/lib/dates";

import { AiForm, FinanceForm, ProfileForm, ThemePicker } from "./settings-forms";

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--line)", background: "var(--bg)" }}
    >
      <div className="flex items-center gap-2 text-xs sw-muted">
        <span style={{ color: "var(--brand)" }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

export function SettingsView({ data }: { data: SettingsData }) {
  const memberSince = data.memberSince
    ? formatExpenseDate(data.memberSince.slice(0, 10))
    : null;

  return (
    <div>
      {data.notice && (
        <div
          className="sw-enter mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{
            background: `color-mix(in srgb, var(--${
              data.notice.type === "error" ? "danger" : "brand"
            }) 10%, transparent)`,
            color: `var(--${data.notice.type === "error" ? "danger" : "brand"})`,
          }}
        >
          {data.notice.message}
          <Link href="/settings" aria-label="Dismiss" className="ml-auto">
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm sw-muted">
          <span className="sw-dot mr-2 align-middle" />
          Signed in as <b style={{ color: "var(--text)" }}>{data.user.email}</b>
        </p>
        <span
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sw-muted"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <ShieldCheck size={14} style={{ color: "var(--brand)" }} />
          Private to your account
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Profile"
          action={<UserRound size={17} className="sw-muted" />}
        >
          <ProfileForm
            displayName={data.displayName}
            email={data.user.email}
          />
        </Section>

        <Section
          title="Financial preferences"
          action={<SlidersHorizontal size={17} className="sw-muted" />}
        >
          <FinanceForm
            currency={data.currency}
            defaultMonthlyBudget={data.defaultMonthlyBudget}
            currentBudget={data.currentBudget}
            currentMonthLabel={data.currentMonthLabel}
          />

          <div
            className="my-5 border-t"
            style={{ borderColor: "var(--line)" }}
          />

          <ThemePicker />
        </Section>

        <Section
          title="SpendWise AI"
          action={<Bot size={17} className="sw-muted" />}
        >
          <AiForm
            responseStyle={data.aiResponseStyle}
            proactiveTips={data.aiProactiveTips}
          />

          <div
            className="mt-4 flex items-start gap-2 rounded-xl p-3 text-xs sw-muted"
            style={{ background: "var(--bg)" }}
          >
            <Sparkles
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--ai)" }}
            />
            <p>
              These preferences shape how SpendWise AI talks to you. They never
              send your financial data anywhere outside your account.
            </p>
          </div>
        </Section>

        <Section
          title="Data & account"
          action={<Database size={17} className="sw-muted" />}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <StatTile
              label="Expenses"
              value={String(data.counts.expenses)}
              icon={<WalletCards size={14} />}
            />
            <StatTile
              label="Categories"
              value={String(data.counts.categories)}
              icon={<Tags size={14} />}
            />
            <StatTile
              label="Recurring plans"
              value={String(data.counts.recurring)}
              icon={<Repeat2 size={14} />}
            />
          </div>

          <a
            href="/settings/export"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
            style={{ borderColor: "var(--line)" }}
          >
            <span className="flex items-center gap-2">
              <Download size={16} />
              Export my data
            </span>
            <span className="text-xs font-normal sw-muted">JSON</span>
          </a>
          <p className="mt-1 text-xs sw-muted">
            A user-scoped snapshot of expenses, budgets, category budgets,
            categories, recurring plans and settings.
          </p>

          <div
            className="mt-4 border-t pt-4 text-xs sw-muted"
            style={{ borderColor: "var(--line)" }}
          >
            <p>
              Account email: <b style={{ color: "var(--text)" }}>{data.user.email}</b>
            </p>
            {memberSince && <p className="mt-1">Member since {memberSince}</p>}
            {data.earliestExpenseDate && (
              <p className="mt-1">
                Tracking expenses since{" "}
                {formatExpenseDate(data.earliestExpenseDate)}
              </p>
            )}
          </div>

          <form action="/auth/signout" method="post" className="mt-4">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              style={{ borderColor: "var(--line)" }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>

          <p className="mt-3 text-xs sw-muted">
            Account deletion is not available in the web app yet.
          </p>
        </Section>
      </div>
    </div>
  );
}
