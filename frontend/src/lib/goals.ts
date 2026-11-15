import type { GoalContributionRecord, GoalRecord } from "@/lib/types";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.4375;

/**
 * How many days of history a goal needs before we trust a monthly pace.
 * A single deposit on day one would otherwise "project" an absurd finish date.
 */
const MIN_PACE_DAYS = 7;

export const GOAL_EMOJIS = [
  "🎯",
  "💻",
  "✈️",
  "🏠",
  "🚗",
  "📱",
  "🎓",
  "💍",
  "🏖️",
  "🛡️",
  "🎸",
  "🐕",
];

export type GoalStatus =
  | "reached"
  | "on-track"
  | "behind"
  | "overdue"
  | "starting"
  | "in-progress"
  | "no-deadline";

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; color: string }
> = {
  reached: { label: "Reached", color: "var(--brand)" },
  "on-track": { label: "On track", color: "var(--brand)" },
  behind: { label: "Behind", color: "var(--warn)" },
  overdue: { label: "Past due", color: "var(--danger)" },
  starting: { label: "Not started", color: "var(--muted)" },
  "in-progress": { label: "In progress", color: "var(--ai)" },
  "no-deadline": { label: "No deadline", color: "var(--muted)" },
};

export function goalStatusMeta(status: GoalStatus) {
  return GOAL_STATUS_META[status] ?? GOAL_STATUS_META.starting;
}

export function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  return Math.round((end - start) / MS_PER_DAY);
}

export function addDays(date: string, days: number) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return date;

  parsed.setUTCDate(parsed.getUTCDate() + Math.round(days));
  return parsed.toISOString().slice(0, 10);
}

export type GoalProgress = {
  saved: number;
  target: number;
  remaining: number;
  /** Uncapped completion, so an overshoot reads as 130%. */
  percentage: number;
  /** Bar-safe completion, clamped to 0–100. */
  progress: number;
  contributionCount: number;
  lastContributionDate: string | null;
  /** Average saved per month since the first contribution. 0 until trusted. */
  monthlyPace: number;
  projectedDate: string | null;
  daysLeft: number | null;
  status: GoalStatus;
};

export type GoalProgressInput = Pick<
  GoalRecord,
  "target_amount" | "starting_amount" | "target_date"
>;

export type GoalProgressContribution = Pick<
  GoalContributionRecord,
  "amount" | "date"
>;

/**
 * Goal math. Saved = starting amount + every contribution. Projections only
 * appear once the history is long enough to mean something, and they are
 * always derived — nothing about the projection is stored.
 */
export function summarizeGoal(
  goal: GoalProgressInput,
  contributions: GoalProgressContribution[],
  today: string,
): GoalProgress {
  const target = Math.max(Number(goal.target_amount) || 0, 0);
  const starting = Math.max(Number(goal.starting_amount) || 0, 0);

  let contributed = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const contribution of contributions) {
    const amount = Number(contribution.amount) || 0;
    contributed += amount;

    const date = contribution.date.slice(0, 10);

    if (!firstDate || date < firstDate) firstDate = date;
    if (!lastDate || date > lastDate) lastDate = date;
  }

  const saved = Math.round((starting + contributed) * 100) / 100;
  const remaining = Math.max(Math.round((target - saved) * 100) / 100, 0);
  const percentage = target > 0 ? (saved / target) * 100 : 0;
  const progress = Math.min(Math.max(percentage, 0), 100);

  const span = firstDate ? daysBetween(firstDate, today) : 0;
  const monthlyPace =
    span >= MIN_PACE_DAYS && contributed > 0
      ? Math.round(((contributed / span) * DAYS_PER_MONTH * 100) / 100)
      : 0;

  const dailyPace = monthlyPace / DAYS_PER_MONTH;
  const projectedDate =
    remaining > 0 && dailyPace > 0
      ? addDays(today, Math.ceil(remaining / dailyPace))
      : remaining === 0 && target > 0
        ? today
        : null;

  const daysLeft = goal.target_date ? daysBetween(today, goal.target_date) : null;

  let status: GoalStatus;

  if (target > 0 && saved >= target) {
    status = "reached";
  } else if (goal.target_date && daysLeft !== null && daysLeft < 0) {
    status = "overdue";
  } else if (contributions.length === 0) {
    status = "starting";
  } else if (!goal.target_date) {
    status = "no-deadline";
  } else if (!projectedDate) {
    status = "in-progress";
  } else if (projectedDate <= goal.target_date) {
    status = "on-track";
  } else {
    status = "behind";
  }

  return {
    saved,
    target,
    remaining,
    percentage,
    progress,
    contributionCount: contributions.length,
    lastContributionDate: lastDate,
    monthlyPace,
    projectedDate: remaining > 0 ? projectedDate : null,
    daysLeft,
    status,
  };
}
