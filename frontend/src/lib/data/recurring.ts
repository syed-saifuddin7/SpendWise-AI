import "server-only";

import { redirect } from "next/navigation";

import {
  DEFAULT_CATEGORY_NAMES,
  INCOME_CATEGORY_NAMES,
  categoryEmoji,
  defaultCategoryKind,
  isCategoryKind,
} from "@/lib/categories";
import { todayKey } from "@/lib/dates";
import {
  cadenceLabel,
  daysUntil,
  isRecurringFrequency,
  isRecurringType,
  monthlyEquivalent,
  type RecurringFrequency,
  type RecurringType,
} from "@/lib/recurring";
import { createClient } from "@/lib/supabase/server";

export type RecurringCategoryOption = {
  id: number | null;
  name: string;
  emoji: string;
  // Custom categories have no kind yet (that lands with 26.1), so they show
  // for both plan types. "Other" is deliberately shared.
  kind: "expense" | "income" | "both";
};

export type RecurringItem = {
  id: number;
  name: string;
  type: RecurringType;
  amount: number;
  category: string;
  categoryId: number | null;
  emoji: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  isActive: boolean;
  lastGeneratedDate: string | null;
  monthlyAmount: number;
  daysUntilNext: number;
  dueNow: boolean;
  generatedCount: number;
  cadence: string;
};

export type RecurringNotice = {
  type: "success" | "error";
  message: string;
};

export type RecurringData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  today: string;
  items: RecurringItem[];
  activeCount: number;
  pausedCount: number;
  dueCount: number;
  monthlyExpenseTotal: number;
  monthlyIncomeTotal: number;
  annualExpenseTotal: number;
  annualIncomeTotal: number;
  activeExpenseCount: number;
  activeIncomeCount: number;
  nextItem: RecurringItem | null;
  categoryOptions: RecurringCategoryOption[];
  addMode: boolean;
  editingItem: RecurringItem | null;
  notice: RecurringNotice | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildCategoryOptions(
  userCategories: RecurringCategoryOption[],
  rows: RecurringItem[],
) {
  const options = new Map<string, RecurringCategoryOption>();

  for (const name of [...DEFAULT_CATEGORY_NAMES, ...INCOME_CATEGORY_NAMES]) {
    if (options.has(name)) continue;

    options.set(name, {
      id: null,
      name,
      emoji: categoryEmoji(name),
      kind: defaultCategoryKind(name),
    });
  }

  for (const category of userCategories) {
    options.set(category.name, category);
  }

  for (const row of rows) {
    if (!options.has(row.category)) {
      options.set(row.category, {
        id: row.categoryId,
        name: row.category,
        emoji: row.emoji,
        kind: "both",
      });
    }
  }

  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRecurringData(
  params: SearchParams,
): Promise<RecurringData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Frecurring");
  }

  const today = todayKey();

  const [settingsResult, categoriesResult, recurringResult, expensesResult] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select("display_name, currency")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("categories")
        .select("id, name, emoji, kind")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("next_run_date", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, date, recurring_expense_id")
        .eq("user_id", user.id)
        .not("recurring_expense_id", "is", null),
    ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(
      `Could not load categories: ${categoriesResult.error.message}`,
    );
  }

  if (recurringResult.error) {
    throw new Error(
      `Could not load recurring expenses: ${recurringResult.error.message}`,
    );
  }

  if (expensesResult.error) {
    throw new Error(
      `Could not load generated transactions: ${expensesResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";

  const userCategories: RecurringCategoryOption[] = (
    categoriesResult.data ?? []
  ).map((category) => ({
    id: Number(category.id),
    name: String(category.name),
    emoji: categoryEmoji(
      String(category.name),
      (category.emoji as string | null) ?? null,
    ),
    kind: isCategoryKind(String(category.kind))
      ? (String(category.kind) as "expense" | "income" | "both")
      : defaultCategoryKind(String(category.name)),
  }));

  const generatedCounts = new Map<number, number>();

  for (const expense of expensesResult.data ?? []) {
    const recurringId = Number(expense.recurring_expense_id);

    if (!Number.isFinite(recurringId)) continue;

    generatedCounts.set(
      recurringId,
      (generatedCounts.get(recurringId) ?? 0) + 1,
    );
  }

  const items: RecurringItem[] = (recurringResult.data ?? []).map((row) => {
    const frequency = isRecurringFrequency(String(row.frequency))
      ? (String(row.frequency) as RecurringFrequency)
      : "monthly";
    const type = isRecurringType(String(row.type))
      ? (String(row.type) as RecurringType)
      : "expense";
    const amount = Number(row.amount) || 0;
    const startDate = String(row.start_date ?? today);
    const nextRunDate = String(row.next_run_date ?? startDate);
    const isActive = Boolean(row.is_active);
    const daysUntilNext = daysUntil(nextRunDate, today);

    return {
      id: Number(row.id),
      name: String(row.name ?? "Recurring plan"),
      type,
      amount,
      category: String(row.category ?? "Other"),
      categoryId:
        row.category_id === null || row.category_id === undefined
          ? null
          : Number(row.category_id),
      emoji: categoryEmoji(
        String(row.category ?? "Other"),
        userCategories.find(
          (category) => category.name === String(row.category),
        )?.emoji ?? null,
      ),
      description: String(row.description ?? ""),
      frequency,
      startDate,
      nextRunDate,
      isActive,
      lastGeneratedDate: row.last_generated_date
        ? String(row.last_generated_date)
        : null,
      monthlyAmount: monthlyEquivalent(amount, frequency),
      daysUntilNext,
      dueNow: isActive && daysUntilNext <= 0,
      generatedCount: generatedCounts.get(Number(row.id)) ?? 0,
      cadence: cadenceLabel(frequency, startDate),
    };
  });

  items.sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      a.nextRunDate.localeCompare(b.nextRunDate) ||
      a.name.localeCompare(b.name),
  );

  const activeItems = items.filter((item) => item.isActive);
  const activeExpenses = activeItems.filter((item) => item.type === "expense");
  const activeIncomes = activeItems.filter((item) => item.type === "income");
  const monthlyExpenseTotal = activeExpenses.reduce(
    (total, item) => total + item.monthlyAmount,
    0,
  );
  const monthlyIncomeTotal = activeIncomes.reduce(
    (total, item) => total + item.monthlyAmount,
    0,
  );

  const editingId = first(params.edit);
  const editingItem =
    editingId && /^\d+$/.test(editingId)
      ? (items.find((item) => String(item.id) === editingId) ?? null)
      : null;

  const errorMessage = first(params.error);
  const saved = first(params.saved);
  const processed = Number(first(params.processed) ?? "");

  const notice: RecurringNotice | null = errorMessage
    ? { type: "error", message: errorMessage.slice(0, 200) }
    : saved === "added"
      ? { type: "success", message: "Recurring plan added." }
      : saved === "updated"
        ? { type: "success", message: "Recurring plan updated." }
        : first(params.deleted) === "1"
          ? {
              type: "success",
              message:
                "Recurring plan deleted. Transactions it already created stay in your history.",
            }
          : first(params.paused) === "1"
            ? {
                type: "success",
                message: "Recurring plan paused. It will not generate anything.",
              }
            : first(params.resumed) === "1"
              ? { type: "success", message: "Recurring plan resumed." }
              : Number.isFinite(processed) && processed >= 0 && first(params.processed) !== undefined
                ? {
                    type: "success",
                    message:
                      processed > 0
                        ? `Generated ${processed} transaction${
                            processed === 1 ? "" : "s"
                          } from due recurring plans.`
                        : "Nothing is due right now. Your schedule is up to date.",
                  }
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
    items,
    activeCount: activeItems.length,
    pausedCount: items.length - activeItems.length,
    dueCount: activeItems.filter((item) => item.dueNow).length,
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    annualExpenseTotal: monthlyExpenseTotal * 12,
    annualIncomeTotal: monthlyIncomeTotal * 12,
    activeExpenseCount: activeExpenses.length,
    activeIncomeCount: activeIncomes.length,
    nextItem:
      activeItems
        .slice()
        .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))[0] ?? null,
    categoryOptions: buildCategoryOptions(userCategories, items),
    addMode: first(params.add) === "1",
    editingItem,
    notice,
  };
}
