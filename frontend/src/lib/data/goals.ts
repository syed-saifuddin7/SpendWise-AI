import "server-only";

import { redirect } from "next/navigation";

import { todayKey } from "@/lib/dates";
import { summarizeGoal, type GoalStatus } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";
import type { GoalContributionRecord, GoalRecord } from "@/lib/types";

export type GoalRow = {
  id: number;
  name: string;
  emoji: string;
  currency: string;
  targetAmount: number;
  startingAmount: number;
  saved: number;
  remaining: number;
  percentage: number;
  progress: number;
  targetDate: string | null;
  note: string;
  isActive: boolean;
  contributionCount: number;
  lastContributionDate: string | null;
  monthlyPace: number;
  projectedDate: string | null;
  daysLeft: number | null;
  status: GoalStatus;
};

export type ContributionRow = {
  id: number;
  goalId: number;
  goalName: string;
  goalEmoji: string;
  amount: number;
  date: string;
  note: string;
};

export type GoalsNotice = {
  type: "success" | "error";
  message: string;
};

export type GoalsData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  today: string;
  goals: GoalRow[];
  activeGoals: number;
  archivedGoals: number;
  reachedCount: number;
  totalSaved: number;
  totalTarget: number;
  overallPercentage: number;
  monthlyPace: number;
  recentContributions: ContributionRow[];
  addMode: boolean;
  editingGoal: GoalRow | null;
  contributingGoal: GoalRow | null;
  editingContribution: ContributionRow | null;
  notice: GoalsNotice | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numericId(value: string | undefined) {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

export async function getGoalsData(params: SearchParams): Promise<GoalsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fgoals");
  }

  const [settingsResult, goalsResult, contributionsResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("display_name, currency")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("id", { ascending: true }),
    supabase
      .from("goal_contributions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (goalsResult.error) {
    throw new Error(`Could not load goals: ${goalsResult.error.message}`);
  }

  if (contributionsResult.error) {
    throw new Error(
      `Could not load goal contributions: ${contributionsResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";
  const today = todayKey();
  const goalRecords = (goalsResult.data ?? []) as GoalRecord[];
  const contributionRecords =
    (contributionsResult.data ?? []) as GoalContributionRecord[];

  const byGoal = new Map<number, GoalContributionRecord[]>();

  for (const contribution of contributionRecords) {
    const goalId = Number(contribution.goal_id);
    const bucket = byGoal.get(goalId);

    if (bucket) {
      bucket.push(contribution);
    } else {
      byGoal.set(goalId, [contribution]);
    }
  }

  const goals: GoalRow[] = goalRecords
    .map((goal) => {
      const progress = summarizeGoal(goal, byGoal.get(Number(goal.id)) ?? [], today);

      return {
        id: Number(goal.id),
        name: String(goal.name),
        emoji: String(goal.emoji ?? "🎯"),
        currency: String(goal.currency ?? currency),
        targetAmount: progress.target,
        startingAmount: Number(goal.starting_amount) || 0,
        saved: progress.saved,
        remaining: progress.remaining,
        percentage: progress.percentage,
        progress: progress.progress,
        targetDate: goal.target_date ?? null,
        note: String(goal.note ?? ""),
        isActive: Boolean(goal.is_active),
        contributionCount: progress.contributionCount,
        lastContributionDate: progress.lastContributionDate,
        monthlyPace: progress.monthlyPace,
        projectedDate: progress.projectedDate,
        daysLeft: progress.daysLeft,
        status: progress.status,
      };
    })
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        Number(a.status === "reached") - Number(b.status === "reached") ||
        b.progress - a.progress ||
        a.name.localeCompare(b.name),
    );

  const active = goals.filter((goal) => goal.isActive);
  const totalSaved = active.reduce((total, goal) => total + goal.saved, 0);
  const totalTarget = active.reduce((total, goal) => total + goal.targetAmount, 0);
  const monthlyPace = active.reduce((total, goal) => total + goal.monthlyPace, 0);

  const goalIndex = new Map(goals.map((goal) => [goal.id, goal]));

  const contributionRows: ContributionRow[] = contributionRecords.map(
    (contribution) => {
      const goal = goalIndex.get(Number(contribution.goal_id));

      return {
        id: Number(contribution.id),
        goalId: Number(contribution.goal_id),
        goalName: goal?.name ?? "Goal",
        goalEmoji: goal?.emoji ?? "🎯",
        amount: Number(contribution.amount) || 0,
        date: String(contribution.date),
        note: String(contribution.note ?? ""),
      };
    },
  );

  const recentContributions = contributionRows.slice(0, 8);

  const editingGoalId = numericId(first(params.edit));
  const contributingGoalId = numericId(first(params.contribute));
  const editingContributionId = numericId(first(params.contribution));

  const editingGoal =
    editingGoalId !== null
      ? (goals.find((goal) => goal.id === editingGoalId) ?? null)
      : null;
  const contributingGoal =
    contributingGoalId !== null
      ? (goals.find((goal) => goal.id === contributingGoalId) ?? null)
      : null;
  const editingContribution =
    editingContributionId !== null
      ? (contributionRows.find(
          (contribution) => contribution.id === editingContributionId,
        ) ?? null)
      : null;

  const errorMessage = first(params.error);
  const saved = first(params.saved);
  const deleted = first(params.deleted);
  const archived = first(params.archived);
  const restored = first(params.restored);

  const notice: GoalsNotice | null = errorMessage
    ? { type: "error", message: errorMessage.slice(0, 200) }
    : saved === "added"
      ? { type: "success", message: "Goal added. Every contribution moves it closer." }
      : saved === "updated"
        ? { type: "success", message: "Goal updated." }
        : saved === "contributed"
          ? { type: "success", message: "Contribution added." }
          : saved === "contribution-updated"
            ? { type: "success", message: "Contribution updated." }
            : deleted === "goal"
              ? { type: "success", message: "Goal deleted along with its contributions." }
              : deleted === "contribution"
                ? { type: "success", message: "Contribution removed." }
                : archived === "1"
                  ? {
                      type: "success",
                      message:
                        "Goal archived. It keeps its history but no longer counts toward your totals.",
                    }
                  : restored === "1"
                    ? { type: "success", message: "Goal restored." }
                    : null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name:
        (settings?.display_name as string | null)?.trim() ||
        user.email?.split("@")[0] ||
        "there",
    },
    currency,
    today,
    goals,
    activeGoals: active.length,
    archivedGoals: goals.length - active.length,
    reachedCount: active.filter((goal) => goal.status === "reached").length,
    totalSaved,
    totalTarget,
    overallPercentage: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    monthlyPace,
    recentContributions,
    addMode: first(params.add) === "1",
    editingGoal,
    contributingGoal,
    editingContribution,
    notice,
  };
}
