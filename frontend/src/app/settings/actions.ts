"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AI_RESPONSE_STYLES,
  isSupportedCurrency,
  normalizeAiStyle,
  type AiResponseStyle,
} from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type SettingsFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function settingsUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/settings?${query}` : "/settings";
}

function revalidateSettingsAreas() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/categories");
  revalidatePath("/recurring");
  revalidatePath("/analytics");
  revalidatePath("/monthly-summary");
  revalidatePath("/reports");
  revalidatePath("/ai");
}

async function authenticatedUserId() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=%2Fsettings");
  }

  return { supabase, userId: user.id };
}

type SettingsPatch = {
  displayName?: string | null;
  currency?: string;
  defaultMonthlyBudget?: number;
  aiResponseStyle?: AiResponseStyle;
  aiProactiveTips?: boolean;
};

/**
 * Mirrors `update_user_settings` in `cloud_db.py`: read the current row, merge
 * the changed fields, then upsert on `user_id` so a missing row is created.
 */
async function upsertSettings(userId: string, patch: SettingsPatch) {
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (readError) {
    return { error: `Could not load your settings: ${readError.message}` };
  }

  const record = {
    user_id: userId,
    display_name:
      patch.displayName !== undefined
        ? patch.displayName
        : ((current?.display_name as string | null) ?? null),
    currency:
      patch.currency ??
      ((current?.currency as string | null) || "INR"),
    default_monthly_budget:
      patch.defaultMonthlyBudget !== undefined
        ? patch.defaultMonthlyBudget
        : Number(current?.default_monthly_budget ?? 0) || 0,
    ai_response_style:
      patch.aiResponseStyle ??
      normalizeAiStyle(current?.ai_response_style as string | null),
    ai_proactive_tips:
      patch.aiProactiveTips !== undefined
        ? patch.aiProactiveTips
        : Boolean(current?.ai_proactive_tips ?? true),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_settings")
    .upsert(record, { onConflict: "user_id" });

  if (error) {
    return { error: `Could not save your settings: ${error.message}` };
  }

  return {};
}

export async function saveProfile(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const displayName = readText(formData, "display_name").replace(/\s+/g, " ");

  if (displayName.length > 80) {
    return { error: "Display name must be 80 characters or fewer." };
  }

  const { userId } = await authenticatedUserId();
  const result = await upsertSettings(userId, {
    displayName: displayName || null,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateSettingsAreas();
  redirect(settingsUrl({ saved: "profile" }));
}

export async function saveFinance(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const currency = readText(formData, "currency");

  if (!isSupportedCurrency(currency)) {
    return { error: "Choose a supported currency." };
  }

  const budgetValue = readText(formData, "default_monthly_budget");
  const rawBudget = budgetValue === "" ? 0 : Number(budgetValue.replace(/,/g, ""));

  if (!Number.isFinite(rawBudget) || rawBudget < 0) {
    return { error: "Enter a default budget of 0 or more." };
  }

  if (rawBudget > 1_000_000_000) {
    return { error: "That budget looks too large. Enter a smaller value." };
  }

  const { userId } = await authenticatedUserId();
  const result = await upsertSettings(userId, {
    currency,
    defaultMonthlyBudget: Math.round(rawBudget * 100) / 100,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateSettingsAreas();
  redirect(settingsUrl({ saved: "finance" }));
}

export async function saveAiPreferences(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const rawStyle = readText(formData, "ai_response_style");

  if (!AI_RESPONSE_STYLES.includes(rawStyle as AiResponseStyle)) {
    return { error: "Choose a valid AI response style." };
  }

  const { userId } = await authenticatedUserId();
  const result = await upsertSettings(userId, {
    aiResponseStyle: rawStyle as AiResponseStyle,
    aiProactiveTips: formData.get("ai_proactive_tips") === "1",
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidateSettingsAreas();
  redirect(settingsUrl({ saved: "ai" }));
}
