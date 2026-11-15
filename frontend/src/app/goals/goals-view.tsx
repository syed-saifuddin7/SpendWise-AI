"use client";

import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import { Metric, Progress, Section } from "@/components/spendwise/ui";
import type { ContributionRow, GoalRow, GoalsData } from "@/lib/data/goals";
import { formatExpenseDate } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import { goalStatusMeta } from "@/lib/goals";

import { deleteContribution, deleteGoal, toggleGoal } from "./actions";

function PendingIcon({
  icon,
  label,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10 ${className}`}
    >
      {icon}
    </button>
  );
}

function deadlineText(goal: GoalRow) {
  if (!goal.targetDate) return "No deadline set";

  const when = formatExpenseDate(goal.targetDate);

  if (goal.status === "reached") return `Target date ${when}`;
  if (goal.daysLeft === null) return when;
  if (goal.daysLeft < 0) {
    return `${Math.abs(goal.daysLeft)} day${
      Math.abs(goal.daysLeft) === 1 ? "" : "s"
    } past ${when}`;
  }
  if (goal.daysLeft === 0) return `Due today (${when})`;

  return `${goal.daysLeft} day${goal.daysLeft === 1 ? "" : "s"} left · ${when}`;
}

function projectionText(goal: GoalRow) {
  if (goal.status === "reached") {
    return "Goal reached. Nicely done.";
  }

  if (goal.projectedDate) {
    return `At ${formatMoney(goal.monthlyPace, goal.currency)}/month you finish around ${formatExpenseDate(goal.projectedDate)}.`;
  }

  if (goal.contributionCount === 0) {
    return "Add your first contribution to start tracking pace.";
  }

  return "A few more contributions will unlock a finish date.";
}

function GoalCard({
  goal,
  currency,
}: {
  goal: GoalRow;
  currency: string;
}) {
  const meta = goalStatusMeta(goal.status);
  const money = goal.currency || currency;

  return (
    <div
      className={`sw-card sw-card-lift flex flex-col p-5 ${
        goal.isActive ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xl"
          style={{ background: "var(--bg)" }}
        >
          {goal.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold">{goal.name}</h3>
            {!goal.isActive && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "var(--bg)", color: "var(--muted)" }}
              >
                Archived
              </span>
            )}
          </div>
          <p className="truncate text-xs sw-muted">{deadlineText(goal)}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-black tracking-tight">
            {formatMoney(goal.saved, money)}
          </p>
          <p className="text-sm sw-muted">
            of {formatMoney(goal.targetAmount, money)}
          </p>
        </div>

        <div className="mt-3">
          <Progress value={goal.progress} />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <b style={{ color: meta.color }}>
            {Math.round(goal.percentage)}% funded
          </b>
          <span className="sw-muted">
            {goal.remaining > 0
              ? `${formatMoney(goal.remaining, money)} to go`
              : "Fully funded"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 sw-muted">{projectionText(goal)}</p>

      {goal.note && (
        <p className="mt-2 rounded-lg px-2.5 py-2 text-xs sw-muted" style={{ background: "var(--bg)" }}>
          {goal.note}
        </p>
      )}

      <div
        className="mt-4 flex items-center justify-between gap-2 border-t pt-3 text-xs"
        style={{ borderColor: "var(--line)" }}
      >
        <span className="sw-muted">
          {goal.contributionCount} contribution
          {goal.contributionCount === 1 ? "" : "s"}
          {goal.startingAmount > 0
            ? ` · started at ${formatMoney(goal.startingAmount, money)}`
            : ""}
        </span>

        <div className="flex items-center gap-1">
          <Link
            href={`/goals?contribute=${goal.id}`}
            scroll={false}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            <Plus size={13} />
            Add
          </Link>

          <Link
            href={`/goals?edit=${goal.id}`}
            scroll={false}
            aria-label={`Edit ${goal.name}`}
            title="Edit goal"
            className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Pencil size={15} />
          </Link>

          <form action={toggleGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <input
              type="hidden"
              name="activate"
              value={goal.isActive ? "0" : "1"}
            />
            <PendingIcon
              icon={
                goal.isActive ? (
                  <Archive size={15} />
                ) : (
                  <ArchiveRestore size={15} />
                )
              }
              label={goal.isActive ? "Archive goal" : "Restore goal"}
            />
          </form>

          <form
            action={deleteGoal}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete "${goal.name}"? Its ${goal.contributionCount} contribution${
                    goal.contributionCount === 1 ? "" : "s"
                  } will be deleted too. Archive it instead if you want to keep the history.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={goal.id} />
            <PendingIcon
              icon={<Trash2 size={15} />}
              label="Delete goal"
              className="hover:text-[var(--danger)]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

function ContributionList({
  contributions,
  currency,
}: {
  contributions: ContributionRow[];
  currency: string;
}) {
  return (
    <div className="sw-stagger divide-y" style={{ borderColor: "var(--line)" }}>
      {contributions.map((contribution) => (
        <div
          key={contribution.id}
          className="flex flex-wrap items-center gap-3 py-3.5"
        >
          <div
            className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
            style={{ background: "var(--bg)" }}
          >
            {contribution.goalEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{contribution.goalName}</div>
            <div className="truncate text-xs sw-muted">
              {formatExpenseDate(contribution.date)}
              {contribution.note ? ` · ${contribution.note}` : ""}
            </div>
          </div>
          <div
            className="font-bold"
            style={{ color: "var(--brand)" }}
          >
            +{formatMoney(contribution.amount, currency)}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/goals?contribution=${contribution.id}`}
              scroll={false}
              aria-label={`Edit contribution to ${contribution.goalName}`}
              title="Edit contribution"
              className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Pencil size={14} />
            </Link>
            <form
              action={deleteContribution}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    `Remove this ${formatMoney(contribution.amount, currency)} contribution?`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={contribution.id} />
              <PendingIcon
                icon={<Trash2 size={14} />}
                label="Remove contribution"
                className="hover:text-[var(--danger)]"
              />
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GoalsView({ data }: { data: GoalsData }) {
  const addHref = "/goals?add=1";
  const activeGoals = data.goals.filter((goal) => goal.isActive);

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
            href="/goals"
            scroll={false}
            aria-label="Dismiss"
            className="ml-auto"
          >
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Saved so far"
          value={formatMoney(data.totalSaved, data.currency)}
          note={`${data.activeGoals} active goal${
            data.activeGoals === 1 ? "" : "s"
          }`}
          icon={<Wallet size={17} />}
        />
        <Metric
          label="Total target"
          value={formatMoney(data.totalTarget, data.currency)}
          note={`${Math.round(data.overallPercentage)}% funded across all goals`}
          icon={<Target size={17} />}
        />
        <Metric
          label="Goals reached"
          value={`${data.reachedCount} / ${data.activeGoals}`}
          note={
            data.reachedCount > 0
              ? "Keep the streak going"
              : "Your first finish line is waiting"
          }
          good={data.reachedCount > 0}
          icon={<TrendingUp size={17} />}
        />
        <Metric
          label="Monthly pace"
          value={formatMoney(data.monthlyPace, data.currency)}
          note="average saved per month"
          icon={<TrendingUp size={17} />}
        />
      </div>

      <div className="mt-4">
        <Section
          title="Your goals"
          action={
            <span className="text-xs sw-muted">
              {data.activeGoals} active
              {data.archivedGoals > 0 ? ` · ${data.archivedGoals} archived` : ""}
            </span>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm sw-muted">
              Name what you are saving for, then chip away at it. Progress is
              starting amount plus every contribution.
            </p>
            <Link
              href={addHref}
              scroll={false}
              className="sw-glow sw-shine flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: "var(--brand)" }}
            >
              <Plus size={16} />
              New goal
            </Link>
          </div>

          {data.goals.length ? (
            <div className="sw-stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} currency={data.currency} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Target className="mx-auto sw-muted" size={30} />
              <p className="mt-3 font-semibold">No goals yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm sw-muted">
                A laptop, a trip, a rainy-day fund — name it, set the price, and
                watch the bar fill up.
              </p>
              <Link
                href={addHref}
                scroll={false}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Create your first goal
              </Link>
            </div>
          )}

          {!activeGoals.length && data.goals.length > 0 && (
            <p className="mt-4 text-xs sw-muted">
              Every goal is archived, so totals above read zero. Restore one to
              bring it back into the plan.
            </p>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section
          title="Recent contributions"
          action={
            <span className="text-xs sw-muted">
              last {data.recentContributions.length}
            </span>
          }
        >
          {data.recentContributions.length ? (
            <ContributionList
              contributions={data.recentContributions}
              currency={data.currency}
            />
          ) : (
            <p className="py-8 text-center text-sm sw-muted">
              Contributions you add will show up here with their goal and date.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
