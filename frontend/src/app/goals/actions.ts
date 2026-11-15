"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidDateKey } from "@/lib/dates";
import { isSupportedCurrency } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type GoalFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function goalsUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/goals?${query}` : "/goals";
}

function revalidateGoalAreas() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

function parseAmount(value: string) {
  return Number(value.replace(/,/g, ""));
}

function friendlyError(message: string) {
  const text = message.toLowerCase();

  if (text.includes("duplicate") || text.includes("unique")) {
    return "You already have a goal with this name.";
  }

  return message;
}

async function requireUser(nextPath: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return { supabase, user };
}

export async function saveGoal(
  _previousState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const id = readText(formData, "id");
  const name = readText(formData, "name").replace(/\s+/g, " ");
  const emoji = readText(formData, "emoji").slice(0, 8) || "🎯";
  const currency = readText(formData, "currency");
  const targetValue = readText(formData, "target_amount");
  const startingValue = readText(formData, "starting_amount");
  const targetDate = readText(formData, "target_date");
  const note = readText(formData, "note").slice(0, 280);

  if (!name) {
    return { error: "Give this goal a name." };
  }

  if (name.length > 80) {
    return { error: "Goal name must be 80 characters or fewer." };
  }

  if (!isSupportedCurrency(currency)) {
    return { error: "Choose a supported currency." };
  }

  const target = parseAmount(targetValue);

  if (!Number.isFinite(target) || target <= 0) {
    return { error: "Set a target amount above zero." };
  }

  if (target > 1_000_000_000) {
    return { error: "That target looks too large." };
  }

  const starting = startingValue === "" ? 0 : parseAmount(startingValue);

  if (!Number.isFinite(starting) || starting < 0) {
    return { error: "Starting amount cannot be negative." };
  }

  if (starting > 1_000_000_000) {
    return { error: "That starting amount looks too large." };
  }

  if (targetDate && !isValidDateKey(targetDate)) {
    return { error: "Enter a valid target date." };
  }

  const { supabase, user } = await requireUser("/goals");

  const { data: existingGoals, error: existingError } = await supabase
    .from("goals")
    .select("id, name")
    .eq("user_id", user.id);

  if (existingError) {
    return { error: `Could not check your goals: ${existingError.message}` };
  }

  const duplicate = (existingGoals ?? []).find(
    (goal) =>
      String(goal.name).toLowerCase() === name.toLowerCase() &&
      String(goal.id) !== id,
  );

  if (duplicate) {
    return { error: "You already have a goal with this name." };
  }

  const record = {
    name,
    emoji,
    currency,
    target_amount: Math.round(target * 100) / 100,
    starting_amount: Math.round(starting * 100) / 100,
    target_date: targetDate || null,
    note,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That goal could not be found." };
    }

    const { data: goalRow, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError) {
      return { error: `Could not update the goal: ${goalError.message}` };
    }

    if (!goalRow) {
      return { error: "That goal could not be found." };
    }

    const { error } = await supabase
      .from("goals")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: friendlyError(`Could not update the goal: ${error.message}`) };
    }

    revalidateGoalAreas();
    redirect(goalsUrl({ saved: "updated" }));
  }

  const { error } = await supabase.from("goals").insert({
    ...record,
    user_id: user.id,
    is_active: true,
  });

  if (error) {
    return { error: friendlyError(`Could not add the goal: ${error.message}`) };
  }

  revalidateGoalAreas();
  redirect(goalsUrl({ saved: "added" }));
}

export async function toggleGoal(formData: FormData) {
  const id = readText(formData, "id");
  const activate = readText(formData, "activate") === "1";

  if (!/^\d+$/.test(id)) {
    redirect(goalsUrl({ error: "That goal could not be found." }));
  }

  const { supabase, user } = await requireUser("/goals");

  const { error } = await supabase
    .from("goals")
    .update({ is_active: activate })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(goalsUrl({ error: `Could not update the goal: ${error.message}` }));
  }

  revalidateGoalAreas();
  redirect(activate ? goalsUrl({ restored: "1" }) : goalsUrl({ archived: "1" }));
}

export async function deleteGoal(formData: FormData) {
  const id = readText(formData, "id");

  if (!/^\d+$/.test(id)) {
    redirect(goalsUrl({ error: "That goal could not be found." }));
  }

  const { supabase, user } = await requireUser("/goals");

  // Contributions cascade with the goal, so the confirmation copy warns about
  // that. Archiving is the history-preserving option.
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(goalsUrl({ error: `Could not delete the goal: ${error.message}` }));
  }

  revalidateGoalAreas();
  redirect(goalsUrl({ deleted: "goal" }));
}

export async function saveContribution(
  _previousState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const id = readText(formData, "id");
  const goalId = readText(formData, "goal_id");
  const amountValue = readText(formData, "amount");
  const date = readText(formData, "date");
  const note = readText(formData, "note").slice(0, 200);

  if (!/^\d+$/.test(goalId)) {
    return { error: "That goal could not be found." };
  }

  const amount = parseAmount(amountValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a contribution above zero." };
  }

  if (amount > 1_000_000_000) {
    return { error: "That contribution looks too large." };
  }

  if (!isValidDateKey(date)) {
    return { error: "Enter a valid contribution date." };
  }

  const { supabase, user } = await requireUser("/goals");

  const { data: goalRow, error: goalError } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (goalError) {
    return { error: `Could not load the goal: ${goalError.message}` };
  }

  if (!goalRow) {
    return { error: "That goal could not be found." };
  }

  const record = {
    amount: Math.round(amount * 100) / 100,
    date,
    note,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That contribution could not be found." };
    }

    const { data: contributionRow, error: contributionError } = await supabase
      .from("goal_contributions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (contributionError) {
      return {
        error: `Could not update the contribution: ${contributionError.message}`,
      };
    }

    if (!contributionRow) {
      return { error: "That contribution could not be found." };
    }

    const { error } = await supabase
      .from("goal_contributions")
      .update({ ...record, goal_id: Number(goalId) })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return {
        error: `Could not update the contribution: ${error.message}`,
      };
    }

    revalidateGoalAreas();
    redirect(goalsUrl({ saved: "contribution-updated" }));
  }

  const { error } = await supabase.from("goal_contributions").insert({
    ...record,
    user_id: user.id,
    goal_id: Number(goalId),
  });

  if (error) {
    return { error: `Could not add the contribution: ${error.message}` };
  }

  revalidateGoalAreas();
  redirect(goalsUrl({ saved: "contributed" }));
}

export async function deleteContribution(formData: FormData) {
  const id = readText(formData, "id");

  if (!/^\d+$/.test(id)) {
    redirect(goalsUrl({ error: "That contribution could not be found." }));
  }

  const { supabase, user } = await requireUser("/goals");

  const { error } = await supabase
    .from("goal_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      goalsUrl({ error: `Could not remove the contribution: ${error.message}` }),
    );
  }

  revalidateGoalAreas();
  redirect(goalsUrl({ deleted: "contribution" }));
}
