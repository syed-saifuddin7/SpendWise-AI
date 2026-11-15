import {
  CalendarClock,
  CalendarDays,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";

import { Metric, Section } from "@/components/spendwise/ui";
import type { RecurringData, RecurringItem } from "@/lib/data/recurring";
import { formatExpenseDate } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import {
  frequencyLabel,
  recurringTypeMeta,
} from "@/lib/recurring";

import {
  ProcessDueForm,
  RecurringDeleteForm,
  RecurringToggleForm,
} from "./recurring-forms";

function FrequencyBadge({ item }: { item: RecurringItem }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
    >
      {frequencyLabel(item.frequency)}
    </span>
  );
}

function TypeBadge({ item }: { item: RecurringItem }) {
  const meta = recurringTypeMeta(item.type);
  const income = item.type === "income";

  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={
        income
          ? {
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              color: "var(--brand)",
            }
          : { background: "var(--bg)", color: "var(--muted)" }
      }
    >
      {meta.emoji} {meta.label}
    </span>
  );
}

function StatusBadge({ item }: { item: RecurringItem }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={
        item.isActive
          ? {
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              color: "var(--brand)",
            }
          : {
              background: "color-mix(in srgb, var(--warn) 14%, transparent)",
              color: "var(--warn)",
            }
      }
    >
      {item.isActive ? "Active" : "Paused"}
    </span>
  );
}

function DueBadge({ item }: { item: RecurringItem }) {
  if (!item.dueNow) return null;

  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--danger) 12%, transparent)",
        color: "var(--danger)",
      }}
    >
      Due now
    </span>
  );
}

function RecurringCard({
  item,
  currency,
}: {
  item: RecurringItem;
  currency: string;
}) {
  const dueColor = item.dueNow
    ? "var(--danger)"
    : item.daysUntilNext <= 3
      ? "var(--warn)"
      : "var(--muted)";

  return (
    <div
      className="sw-card sw-card-lift group p-4"
      style={{
        background: item.isActive ? "var(--panel)" : "var(--bg)",
        borderColor: item.dueNow ? "var(--danger)" : "var(--line)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xl transition group-hover:scale-110"
          style={{
            background: item.isActive ? "var(--brand-soft)" : "var(--panel)",
          }}
        >
          {item.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{item.name}</span>
            <TypeBadge item={item} />
            <FrequencyBadge item={item} />
            <StatusBadge item={item} />
            <DueBadge item={item} />
          </div>

          <div className="mt-1 text-xs sw-muted">
            {item.cadence} · {item.category}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className="font-bold"
            style={
              item.type === "income" ? { color: "var(--brand)" } : undefined
            }
          >
            {item.type === "income" ? "+" : "−"}
            {formatMoney(item.amount, currency)}
          </div>
          <div className="text-[11px] sw-muted">
            ≈ {formatMoney(item.monthlyAmount, currency)}/mo
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span style={{ color: dueColor }}>
          <CalendarClock size={12} className="mr-1 inline" />
          {item.isActive
            ? `Next run ${formatExpenseDate(item.nextRunDate)}`
            : `Paused · was due ${formatExpenseDate(item.nextRunDate)}`}
        </span>
        {item.isActive && (
          <span className="font-semibold" style={{ color: dueColor }}>
            {item.dueNow
              ? item.daysUntilNext < 0
                ? `Overdue by ${Math.abs(item.daysUntilNext)} day${
                    Math.abs(item.daysUntilNext) === 1 ? "" : "s"
                  }`
                : "Due today"
              : item.daysUntilNext === 1
                ? "Due tomorrow"
                : `Due in ${item.daysUntilNext} days`}
          </span>
        )}
      </div>

      {item.description && (
        <p className="mt-2 line-clamp-2 text-xs sw-muted">{item.description}</p>
      )}

      <div
        className="mt-3 flex items-center justify-between gap-2 border-t pt-3"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="text-[11px] sw-muted">
          {item.generatedCount > 0 ? (
            <>
              {item.generatedCount}{" "}
              {item.type === "income" ? "income" : "expense"}
              {item.generatedCount === 1 ? "" : "s"} generated
              {item.lastGeneratedDate
                ? ` · last ${formatExpenseDate(item.lastGeneratedDate)}`
                : ""}
            </>
          ) : (
            <>Started {formatExpenseDate(item.startDate)} · nothing generated yet</>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/recurring?edit=${item.id}`}
            scroll={false}
            aria-label={`Edit ${item.name}`}
            title="Edit recurring plan"
            className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Pencil size={14} />
          </Link>
          <RecurringToggleForm item={item} />
          <RecurringDeleteForm item={item} />
        </div>
      </div>
    </div>
  );
}

export function RecurringView({ data }: { data: RecurringData }) {
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
          <Link href="/recurring" aria-label="Dismiss" className="ml-auto">
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm sw-muted">
          <span className="sw-dot mr-2 align-middle" />
          Set predictable money in and out once. SpendWise generates it on
          schedule.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {data.dueCount > 0 && <ProcessDueForm dueCount={data.dueCount} />}
          <Link
            href="/recurring?add=1"
            scroll={false}
            className="sw-glow sw-shine flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: "var(--brand)" }}
          >
            <Plus size={16} />
            Add recurring
          </Link>
        </div>
      </div>

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Active plans"
          value={String(data.activeCount)}
          note={
            data.pausedCount > 0
              ? `${data.pausedCount} paused`
              : "All schedules running"
          }
          icon={<Repeat2 size={17} />}
        />
        <Metric
          label="Monthly bills"
          value={formatMoney(data.monthlyExpenseTotal, data.currency)}
          note={`${data.activeExpenseCount} expense plan${
            data.activeExpenseCount === 1 ? "" : "s"
          } · ≈ ${formatMoney(data.annualExpenseTotal, data.currency)}/yr`}
          icon={<WalletCards size={17} />}
        />
        <Metric
          label="Monthly income"
          value={formatMoney(data.monthlyIncomeTotal, data.currency)}
          note={`${data.activeIncomeCount} income plan${
            data.activeIncomeCount === 1 ? "" : "s"
          } · ≈ ${formatMoney(data.annualIncomeTotal, data.currency)}/yr`}
          icon={<WalletCards size={17} />}
        />
        <Metric
          label="Due now"
          value={String(data.dueCount)}
          note={
            data.dueCount > 0
              ? "Ready to generate"
              : "Nothing waiting today"
          }
          good={data.dueCount === 0}
          icon={<CalendarClock size={17} />}
        />
        <Metric
          label="Next up"
          value={data.nextItem?.name ?? "—"}
          note={
            data.nextItem
              ? `${formatExpenseDate(data.nextItem.nextRunDate)} · ${
                  data.nextItem.daysUntilNext <= 0
                    ? "due now"
                    : `in ${data.nextItem.daysUntilNext} day${
                        data.nextItem.daysUntilNext === 1 ? "" : "s"
                      }`
                }`
              : "Add a plan to schedule one"
          }
          icon={<CalendarDays size={17} />}
        />
      </div>

      <div className="mt-4">
        <Section
          title="Recurring schedule"
          action={
            <span className="text-xs sw-muted">
              {data.items.length} plan{data.items.length === 1 ? "" : "s"} ·{" "}
              {data.activeCount} active
            </span>
          }
        >
          {data.items.length > 0 ? (
            <div className="sw-stagger grid gap-3 lg:grid-cols-2">
              {data.items.map((item) => (
                <RecurringCard
                  key={item.id}
                  item={item}
                  currency={data.currency}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border border-dashed p-8 text-center"
              style={{ borderColor: "var(--line)" }}
            >
              <div
                className="mx-auto grid size-12 place-items-center rounded-2xl"
                style={{
                  background: "var(--brand-soft)",
                  color: "var(--brand)",
                }}
              >
                <Repeat2 size={22} />
              </div>
              <p className="mt-3 font-semibold">No recurring plans yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm sw-muted">
                Rent, internet, subscriptions, salary, retainers — anything
                predictable can live here.
              </p>
              <Link
                href="/recurring?add=1"
                scroll={false}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Add your first plan
              </Link>
            </div>
          )}
        </Section>
      </div>

      <div className="sw-card sw-hero mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <b>How automation works</b>
          <ul className="mt-2 space-y-1 text-sm sw-muted">
            <li>
              • The first transaction is generated one full cycle after the
              start date, then the schedule advances automatically. Income plans
              post income; expense plans post expenses.
            </li>
            <li>
              • Monthly plans keep the same day and clamp short months; yearly
              plans handle Feb 29 safely.
            </li>
            <li>
              • Duplicate protection means processing twice never creates the
              same transaction twice. Pausing stops generation without deleting
              history.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
