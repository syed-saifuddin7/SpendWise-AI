import {
  ArrowDownRight,
  ArrowLeftRight,
  Landmark,
  Sparkles,
  Target,
  TrendingDown,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import {
  Bars,
  Metric,
  Progress,
  Ring,
  Section,
  TransactionRows,
} from "@/components/spendwise/ui";
import { Shell } from "@/components/spendwise/shell";
import { categoryEmoji } from "@/lib/categories";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/finance";

export default async function Page() {
  const data = await getDashboardData();

  const firstName = data.user.name.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";

  const topCategory = data.categories[0];
  const budgetAvailable = data.budget > 0;
  const budgetStatus =
    data.budgetLeft < 0
      ? `You are ${formatMoney(
          Math.abs(data.budgetLeft),
          data.currency,
        )} over budget this month.`
      : budgetAvailable
        ? `You have ${formatMoney(
            data.budgetLeft,
            data.currency,
          )} left in your budget.`
        : "Set a monthly budget to unlock budget tracking and your health score.";

  const insight = data.expenseCount
    ? `${
        topCategory?.name ?? "Your top category"
      } accounts for ${Math.round(
        topCategory?.percentage ?? 0,
      )}% of this month's spending. ${budgetStatus}`
    : "No expenses recorded this month yet. Add your first expense to start seeing spending insights.";

  const healthColor =
    !data.health.available
      ? "var(--line)"
      : data.health.score! >= 75
        ? "var(--brand)"
        : data.health.score! >= 40
          ? "var(--warn)"
          : "var(--danger)";

  return (
    <Shell
      title={`${greeting}, ${firstName} 👋`}
      subtitle="Here's how your money is looking this month."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Total balance"
          value={formatMoney(data.totalBalance, data.currency)}
          note={`${data.walletCount} wallet${
            data.walletCount === 1 ? "" : "s"
          } · opening balances included`}
          good={data.totalBalance >= 0}
          icon={<Landmark size={17} />}
        />
        <Metric
          label="Spent this month"
          value={formatMoney(data.totalSpent, data.currency)}
          note={`${data.expenseCount} expense${
            data.expenseCount === 1 ? "" : "s"
          }`}
          icon={<Wallet size={17} />}
        />
        <Metric
          label="Income this month"
          value={formatMoney(data.monthlyIncome, data.currency)}
          note={`${data.incomeCount} income entr${
            data.incomeCount === 1 ? "y" : "ies"
          }`}
          icon={<ArrowDownRight size={17} />}
        />
        <Metric
          label="Net cash flow"
          value={formatMoney(data.netCashFlow, data.currency)}
          note={
            data.savingsRate === null
              ? "income minus spending"
              : `${Math.round(data.savingsRate)}% of income kept`
          }
          good={data.netCashFlow >= 0}
          icon={<ArrowLeftRight size={17} />}
        />
        <Metric
          label="Budget remaining"
          value={
            budgetAvailable
              ? formatMoney(data.budgetLeft, data.currency)
              : "Not set"
          }
          note={
            budgetAvailable
              ? `${Math.round(data.budgetPercentage)}% of budget used`
              : "Add a budget to track progress"
          }
          good={budgetAvailable ? data.budgetLeft >= 0 : false}
          icon={<TrendingDown size={17} />}
        />
      </div>

      <div className="sw-stagger mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Section
          title="Daily Spending"
          action={<span className="text-xs sw-muted">{data.monthLabel}</span>}
        >
          <Bars values={data.dailyTotals} currency={data.currency} />
          <div className="mt-3 flex justify-between text-xs sw-muted">
            <span>1</span>
            <span>{Math.ceil(data.daysInMonth / 2)}</span>
            <span>{data.daysInMonth}</span>
          </div>
          <div className="mt-2 text-xs sw-muted">
            {data.monthLabel} · {formatMoney(data.totalSpent, data.currency)}{" "}
            spent · {formatMoney(data.dailyAverage, data.currency)}/day
          </div>
        </Section>

        <Section
          title="Spending Insight"
          action={<Sparkles size={18} style={{ color: "var(--ai)" }} />}
        >
          <div
            className="rounded-2xl p-4"
            style={{
              background: "color-mix(in srgb,var(--ai) 9%,transparent)",
            }}
          >
            <b>
              {data.transactionCount
                ? "Here's what stands out this month."
                : "Your month is a blank slate."}
            </b>
            <p className="mt-2 text-sm leading-6 sw-muted">{insight}</p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "var(--ai)" }}>
              Live insights are generated from your Supabase data.
            </p>
          </div>
        </Section>
      </div>

      <div className="sw-stagger mt-4 grid gap-4 xl:grid-cols-2">
        <Section
          title="Monthly Budget"
          action={
            budgetAvailable ? (
              <b className="text-sm">
                {formatMoney(data.totalSpent, data.currency)} /{" "}
                {formatMoney(data.budget, data.currency)}
              </b>
            ) : (
              <span className="text-xs sw-muted">Not configured</span>
            )
          }
        >
          {budgetAvailable ? (
            <>
              <Progress value={data.budgetPercentage} />
              <div className="mt-3 flex justify-between text-sm">
                <span className="sw-muted">
                  {Math.round(data.budgetPercentage)}% used
                </span>
                <b
                  style={{
                    color:
                      data.budgetLeft < 0 ? "var(--danger)" : "var(--text)",
                  }}
                >
                  {data.budgetLeft < 0 ? "Over by " : "Left: "}
                  {formatMoney(Math.abs(data.budgetLeft), data.currency)}
                </b>
              </div>

              {data.categoryBudgets.length > 0 && (
                <div
                  className="mt-4 space-y-3 border-t pt-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Category budgets</span>
                    <span className="sw-muted">
                      {data.categoryBudgets.length} active
                    </span>
                  </div>
                  {data.categoryBudgets.slice(0, 3).map((categoryBudget) => (
                    <div key={categoryBudget.name}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span>
                          {categoryEmoji(categoryBudget.name)}{" "}
                          {categoryBudget.name}
                        </span>
                        <span
                          className="sw-muted"
                          style={{
                            color:
                              categoryBudget.percentage >= 100
                                ? "var(--danger)"
                                : undefined,
                          }}
                        >
                          {Math.round(categoryBudget.percentage)}%
                        </span>
                      </div>
                      <Progress value={categoryBudget.percentage} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm sw-muted">
              Add a monthly budget in the Budgets page to see progress, alerts,
              and your Financial Health Score.
            </p>
          )}
        </Section>

        <Section
          title="Financial Health"
          action={
            data.health.available ? (
              <span className="text-xs font-semibold sw-muted">
                {data.health.rating}
              </span>
            ) : undefined
          }
        >
          <div className="flex items-center gap-5">
            <Ring
              value={data.health.score ?? 0}
              size={104}
              stroke={10}
              color={healthColor}
              ariaLabel={
                data.health.available
                  ? `Financial health ${data.health.score} out of 100`
                  : "Financial health unavailable"
              }
            >
              <div className="text-center">
                <div className="text-2xl font-black leading-none">
                  {data.health.available ? data.health.score : "—"}
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-widest sw-muted">
                  score
                </div>
              </div>
            </Ring>
            <div>
              {data.health.available ? (
                <>
                  <b className="text-lg">{data.health.rating}</b>
                  <p className="mt-1 text-sm leading-6 sw-muted">
                    {data.health.categoryBudgetsTracked > 0
                      ? `Based on your overall budget, ${data.health.categoryBudgetsTracked} category budget${
                          data.health.categoryBudgetsTracked === 1 ? "" : "s"
                        }, and how evenly your spending is spread.`
                      : "Based on your monthly budget usage and how evenly your spending is spread across the month."}
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 sw-muted">
                  {data.health.reason}
                </p>
              )}
            </div>
          </div>
        </Section>
      </div>

      <div className="sw-stagger mt-4 grid gap-4 xl:grid-cols-2">
        <Section
          title="Recent Transactions"
          action={
            <span className="text-xs sw-muted">{data.monthLabel}</span>
          }
        >
          <TransactionRows
            transactions={data.recent}
            currency={data.currency}
          />
        </Section>

        <Section
          title="Top Categories"
          action={
            <span className="text-xs sw-muted">
              {data.categories.length} categor
              {data.categories.length === 1 ? "y" : "ies"}
            </span>
          }
        >
          {data.categories.length ? (
            <div className="space-y-4">
              {data.categories.slice(0, 5).map((category) => (
                <div key={category.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="text-base">
                        {categoryEmoji(category.name)}
                      </span>
                      {category.name}
                    </span>
                    <span className="sw-muted">
                      {formatMoney(category.amount, data.currency)} ·{" "}
                      {Math.round(category.percentage)}%
                    </span>
                  </div>
                  <Progress value={category.percentage} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm sw-muted">
              Category breakdown will appear once you add expenses.
            </p>
          )}
        </Section>
      </div>

      <div className="sw-stagger mt-4">
        <Section
          title="Savings Goals"
          action={
            <Link
              href="/goals"
              scroll={false}
              className="text-xs font-semibold"
              style={{ color: "var(--brand)" }}
            >
              Manage goals
            </Link>
          }
        >
          {data.goals.length ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 sw-muted">
                  <Target size={16} />
                  {data.goals.length} active goal
                  {data.goals.length === 1 ? "" : "s"} ·{" "}
                  {Math.round(
                    data.goalsTarget > 0
                      ? (data.goalsSaved / data.goalsTarget) * 100
                      : 0,
                  )}
                  % funded
                </span>
                <b>
                  {formatMoney(data.goalsSaved, data.currency)} /{" "}
                  {formatMoney(data.goalsTarget, data.currency)}
                </b>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {data.goals.slice(0, 3).map((goal) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span className="text-base">{goal.emoji}</span>
                        <span className="truncate">{goal.name}</span>
                      </span>
                      <span className="shrink-0 text-xs sw-muted">
                        {Math.round(goal.percentage)}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={goal.progress} />
                    </div>
                    <div className="mt-2 text-xs sw-muted">
                      {formatMoney(goal.saved, data.currency)} of{" "}
                      {formatMoney(goal.target, data.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-sm sw-muted">
              No savings goals yet.{" "}
              <Link
                href="/goals"
                scroll={false}
                className="font-semibold"
                style={{ color: "var(--brand)" }}
              >
                Create one
              </Link>{" "}
              and it will show up here with its progress.
            </p>
          )}
        </Section>
      </div>
    </Shell>
  );
}
