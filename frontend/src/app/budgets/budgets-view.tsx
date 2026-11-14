import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Gauge,
  PiggyBank,
  Plus,
  Target,
  TrendingDown,
  TriangleAlert,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";

import { Metric, Progress, Ring, Section } from "@/components/spendwise/ui";
import type { BudgetsData } from "@/lib/data/budgets";
import { monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";

import {
  BudgetEditor,
  CategoryBudgetForm,
  CopyBudgetButton,
  DeleteCategoryBudgetForm,
} from "./budget-forms";

function buildUrl(
  data: BudgetsData,
  overrides: Record<string, string | null> = {},
) {
  const params = new URLSearchParams({ month: data.monthKey });

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  return `/budgets?${params.toString()}`;
}

function healthColor(score: number | null) {
  if (score === null) return "var(--line)";
  if (score >= 75) return "var(--brand)";
  if (score >= 40) return "var(--warn)";
  return "var(--danger)";
}

export function BudgetsView({ data }: { data: BudgetsData }) {
  const prevHref = buildUrl(data, {
    month: data.previousMonth,
    saved: null,
    deleted: null,
    error: null,
    category: null,
  });
  const nextHref = buildUrl(data, {
    month: data.nextMonth,
    saved: null,
    deleted: null,
    error: null,
    category: null,
  });
  const baseUrl = buildUrl(data, {
    saved: null,
    deleted: null,
    error: null,
    category: null,
  });

  const budgetAvailable = data.monthlyBudget > 0;
  const overBudget = data.remaining < 0;
  const scoreColor = healthColor(data.health.score);
  const ringValue = Math.min(data.percentage, 100);

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
          <Link
            href={baseUrl}
            scroll={false}
            aria-label="Dismiss"
            className="ml-auto"
          >
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center justify-between gap-1 rounded-xl p-1"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <Link
            href={prevHref}
            scroll={false}
            aria-label={`Previous month (${monthLabel(data.previousMonth)})`}
            className="grid size-9 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ChevronLeft size={17} />
          </Link>
          <span className="min-w-36 text-center text-sm font-semibold">
            {data.monthLabel}
          </span>
          {data.nextDisabled ? (
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-lg opacity-30"
            >
              <ChevronRight size={17} />
            </span>
          ) : (
            <Link
              href={nextHref}
              scroll={false}
              aria-label={`Next month (${monthLabel(data.nextMonth)})`}
              className="grid size-9 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronRight size={17} />
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyBudgetButton month={data.monthKey} />
          <Link
            href={`${baseUrl}#category-budget-form`}
            className="sw-glow flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
            style={{ background: "var(--brand)" }}
          >
            <Plus size={14} />
            Category budget
          </Link>
        </div>
      </div>

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Monthly budget"
          value={
            budgetAvailable
              ? formatMoney(data.monthlyBudget, data.currency)
              : "Not set"
          }
          note={
            budgetAvailable
              ? data.isCurrentMonth
                ? "for this month"
                : "for the selected month"
              : "Set one to unlock progress"
          }
          good={budgetAvailable}
          icon={<WalletCards size={17} />}
        />
        <Metric
          label="Spent"
          value={formatMoney(data.spent, data.currency)}
          note={`${Math.round(data.percentage)}% of budget used`}
          good={!overBudget}
          icon={<TrendingDown size={17} />}
        />
        <Metric
          label="Remaining"
          value={
            budgetAvailable
              ? formatMoney(data.remaining, data.currency)
              : "—"
          }
          note={
            budgetAvailable
              ? `${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} left`
              : "Add a monthly budget"
          }
          good={budgetAvailable && !overBudget}
          icon={<PiggyBank size={17} />}
        />
        <Metric
          label="Category budgets"
          value={String(data.categoryRows.length)}
          note={
            data.totalCategoryBudget > 0
              ? `${formatMoney(
                  data.totalCategoryBudget,
                  data.currency,
                )} budgeted`
              : "Optional, but powerful"
          }
          icon={<Target size={17} />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Section
          title="Overall Budget"
          action={
            <span className="text-xs sw-muted">
              {data.isCurrentMonth
                ? `Day ${data.daysElapsed} of ${data.daysInMonth}`
                : data.monthLabel}
            </span>
          }
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <Ring
              value={ringValue}
              size={136}
              stroke={12}
              color={
                !budgetAvailable
                  ? "var(--line)"
                  : overBudget
                    ? "var(--danger)"
                    : data.percentage > 75
                      ? "var(--warn)"
                      : "var(--brand)"
              }
              ariaLabel={
                budgetAvailable
                  ? `${Math.round(data.percentage)} percent of budget used`
                  : "No budget set"
              }
            >
              <div className="text-center">
                <div className="text-3xl font-black tracking-tight">
                  {budgetAvailable ? `${Math.round(data.percentage)}%` : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest sw-muted">
                  used
                </div>
              </div>
            </Ring>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-bold">
                  {formatMoney(data.spent, data.currency)}
                </span>
                <span className="text-sm sw-muted">
                  of{" "}
                  {budgetAvailable
                    ? formatMoney(data.monthlyBudget, data.currency)
                    : "no budget yet"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className="rounded-full px-3 py-1 font-semibold"
                  style={{
                    background: overBudget
                      ? "color-mix(in srgb, var(--danger) 12%, transparent)"
                      : "var(--brand-soft)",
                    color: overBudget ? "var(--danger)" : "var(--brand)",
                  }}
                >
                  {budgetAvailable
                    ? overBudget
                      ? `Over by ${formatMoney(Math.abs(data.remaining), data.currency)}`
                      : `${formatMoney(data.remaining, data.currency)} left`
                    : "Budget not configured"}
                </span>
                <span
                  className="rounded-full px-3 py-1 font-semibold"
                  style={{ background: "var(--bg)", color: "var(--muted)" }}
                >
                  {formatMoney(data.dailyAverage, data.currency)} / day
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs sw-muted">
                <span className="sw-dot" />
                {data.health.available
                  ? `Financial Health ${data.health.score} · ${data.health.rating}`
                  : "Set a budget to unlock your health score"}
              </div>
            </div>
          </div>

          <BudgetEditor
            key={`${data.monthKey}-${data.monthlyBudget}`}
            month={data.monthKey}
            currency={data.currency}
            amount={data.monthlyBudget}
            defaultBudget={data.defaultBudget}
          />
        </Section>

        <Section
          title="Budget Health"
          action={
            <Gauge size={18} style={{ color: scoreColor }} />
          }
        >
          <div className="flex items-center gap-5">
            <Ring
              value={data.health.score ?? 0}
              size={96}
              stroke={9}
              color={scoreColor}
              ariaLabel={
                data.health.available
                  ? `Financial health ${data.health.score} out of 100`
                  : "Financial health unavailable"
              }
            >
              <div className="text-center">
                <div className="text-xl font-black">
                  {data.health.available ? data.health.score : "—"}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest sw-muted">
                  / 100
                </div>
              </div>
            </Ring>
            <div className="min-w-0">
              <b className="text-lg">
                {data.health.available
                  ? data.health.rating
                  : "Not available yet"}
              </b>
              <p className="mt-1 text-sm leading-6 sw-muted">
                {data.health.available
                  ? `${data.health.categoryBudgetsTracked} categor${
                      data.health.categoryBudgetsTracked === 1 ? "y" : "ies"
                    } tracked this month. Category budgets are worth 25 of the 100 points.`
                  : data.health.reason}
              </p>
            </div>
          </div>

          {data.health.available ? (
            <div className="mt-5 space-y-3">
              {[
                ...data.health.attentionFactors.slice(0, 2).map((factor) => ({
                  factor,
                  attention: true,
                })),
                ...data.health.positiveFactors.slice(0, 2).map((factor) => ({
                  factor,
                  attention: false,
                })),
              ].map(({ factor, attention }) => (
                <div key={factor} className="flex items-start gap-2 text-xs">
                  {attention ? (
                    <TriangleAlert
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--warn)" }}
                    />
                  ) : (
                    <CircleCheck
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--brand)" }}
                    />
                  )}
                  <span className="leading-5 sw-muted">{factor}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="mt-5 rounded-xl p-3 text-xs leading-5 sw-muted"
              style={{ background: "var(--bg)" }}
            >
              Add an overall budget above, then category budgets below, and
              SpendWise will score how well each part of your spending is
              controlled.
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section
          title="Category Budgets"
          action={
            <span className="text-xs sw-muted">
              {data.categoryRows.length
                ? `${formatMoney(
                    data.budgetedCategorySpend,
                    data.currency,
                  )} of ${formatMoney(
                    data.totalCategoryBudget,
                    data.currency,
                  )}`
                : "No category budgets yet"}
            </span>
          }
        >
          {data.categoryRows.length ? (
            <div className="sw-stagger grid gap-3 sm:grid-cols-2">
              {data.categoryRows.map((row) => {
                const over = row.percentage >= 100;
                const near = row.percentage >= 80;
                const color = over
                  ? "var(--danger)"
                  : near
                    ? "var(--warn)"
                    : "var(--brand)";

                return (
                  <div
                    key={row.name}
                    className="sw-card sw-card-lift p-4"
                    style={{ background: "var(--bg)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
                        style={{ background: "var(--panel)" }}
                      >
                        {row.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{row.name}</div>
                        <div className="text-xs sw-muted">
                          {formatMoney(row.spent, data.currency)} spent
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
                          color,
                        }}
                      >
                        {Math.round(row.percentage)}%
                      </span>
                    </div>

                    <div className="mt-3">
                      <Progress value={row.percentage} />
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="sw-muted">
                          {formatMoney(row.budget, data.currency)} budget
                        </span>
                        <span style={{ color: over ? "var(--danger)" : undefined }}>
                          {over
                            ? `Over by ${formatMoney(
                                row.spent - row.budget,
                                data.currency,
                              )}`
                            : `${formatMoney(
                                Math.max(row.budget - row.spent, 0),
                                data.currency,
                              )} left`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Link
                        href={`${buildUrl(data, {
                          category: row.name,
                          saved: null,
                          deleted: null,
                          error: null,
                        })}#category-budget-form`}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        Edit
                      </Link>
                      <DeleteCategoryBudgetForm
                        month={data.monthKey}
                        category={row.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Target className="mx-auto sw-muted" size={28} />
              <p className="mt-3 font-semibold">No category budgets yet</p>
              <p className="mt-1 text-sm sw-muted">
                Give a category its own limit to see exactly where your money
                is heading.
              </p>
            </div>
          )}

          <div
            className="mt-6 border-t pt-5"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Set a category budget</h3>
                <p className="text-xs sw-muted">
                  Add or update a limit for any category in {data.monthLabel}.
                </p>
              </div>
              <SparklesMini />
            </div>

            <CategoryBudgetForm
              month={data.monthKey}
              currency={data.currency}
              categories={data.categoryOptions}
              rows={data.categoryRows}
              initialCategory={data.focusCategory}
            />

            <p className="mt-3 text-[11px] sw-muted">
              Tip: category budgets still count your existing expenses, so
              there is no need to re-enter anything.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function SparklesMini() {
  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
    >
      Worth 25 health points
    </span>
  );
}
