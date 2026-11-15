import "server-only";

import { redirect } from "next/navigation";

import { currentMonthKey, monthLabel } from "@/lib/dates";
import {
  isSupportedCurrency,
  normalizeAiStyle,
  type AiResponseStyle,
} from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type SettingsNotice = {
  type: "success" | "error";
  message: string;
};

export type SettingsData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  displayName: string;
  currency: string;
  defaultMonthlyBudget: number;
  aiResponseStyle: AiResponseStyle;
  aiProactiveTips: boolean;
  currentMonthKey: string;
  currentMonthLabel: string;
  currentBudget: number;
  counts: {
    transactions: number;
    wallets: number;
    categories: number;
    recurring: number;
  };
  earliestTransactionDate: string | null;
  memberSince: string | null;
  notice: SettingsNotice | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getSettingsData(
  params: SearchParams,
): Promise<SettingsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fsettings");
  }

  const monthKey = currentMonthKey();

  const [
    settingsResult,
    budgetResult,
    transactionCountResult,
    walletCountResult,
    categoryCountResult,
    recurringCountResult,
    earliestTransactionResult,
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("recurring_expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (budgetResult.error) {
    throw new Error(`Could not load budget: ${budgetResult.error.message}`);
  }

  if (transactionCountResult.error) {
    throw new Error(
      `Could not count transactions: ${transactionCountResult.error.message}`,
    );
  }

  if (walletCountResult.error) {
    throw new Error(
      `Could not count wallets: ${walletCountResult.error.message}`,
    );
  }

  if (categoryCountResult.error) {
    throw new Error(
      `Could not count categories: ${categoryCountResult.error.message}`,
    );
  }

  if (recurringCountResult.error) {
    throw new Error(
      `Could not count recurring expenses: ${recurringCountResult.error.message}`,
    );
  }

  if (earliestTransactionResult.error) {
    throw new Error(
      `Could not load transaction history: ${earliestTransactionResult.error.message}`,
    );
  }

  const settings = settingsResult.data;
  const currency =
    isSupportedCurrency(settings?.currency as string | null)
      ? String(settings?.currency)
      : "INR";
  const displayName =
    (settings?.display_name as string | null)?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  const saved = first(params.saved);
  const errorMessage = first(params.error);

  const notice: SettingsNotice | null = errorMessage
    ? { type: "error", message: errorMessage.slice(0, 200) }
    : saved === "profile"
      ? { type: "success", message: "Profile updated." }
      : saved === "finance"
        ? { type: "success", message: "Financial preferences updated." }
        : saved === "ai"
          ? { type: "success", message: "AI preferences updated." }
          : null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: displayName,
    },
    displayName,
    currency,
    defaultMonthlyBudget:
      Number(settings?.default_monthly_budget ?? 0) || 0,
    aiResponseStyle: normalizeAiStyle(
      settings?.ai_response_style as string | null,
    ),
    aiProactiveTips: Boolean(settings?.ai_proactive_tips ?? true),
    currentMonthKey: monthKey,
    currentMonthLabel: monthLabel(monthKey),
    currentBudget: Number(budgetResult.data?.amount ?? 0) || 0,
    counts: {
      transactions: transactionCountResult.count ?? 0,
      wallets: walletCountResult.count ?? 0,
      categories: categoryCountResult.count ?? 0,
      recurring: recurringCountResult.count ?? 0,
    },
    earliestTransactionDate: earliestTransactionResult.data?.date
      ? String(earliestTransactionResult.data.date)
      : null,
    memberSince: user.created_at ? String(user.created_at) : null,
    notice,
  };
}
