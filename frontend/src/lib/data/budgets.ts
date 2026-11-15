import "server-only";

import { redirect } from "next/navigation";

import {
  DEFAULT_CATEGORY_NAMES,
  categoryColor,
  categoryEmoji,
  defaultCategoryKind,
  isCategoryKind,
} from "@/lib/categories";
import {
  currentMonthKey,
  monthLabel,
  monthRange,
  normalizeMonthKey,
  shiftMonth,
} from "@/lib/dates";
import {
  calculateFinancialHealth,
  type CategoryBudgetProgress,
  type FinancialHealth,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

export type BudgetCategoryOption = {
  id: number | null;
  name: string;
  emoji: string;
  color: string;
  kind: "expense" | "income" | "both";
};

export type BudgetCategoryRow = CategoryBudgetProgress & {
  categoryId: number | null;
  emoji: string;
  color: string;
};

export type BudgetNotice = {
  type: "success" | "error";
  message: string;
};

export type BudgetsData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  monthKey: string;
  monthLabel: string;
  previousMonth: string;
  nextMonth: string;
  nextDisabled: boolean;
  isCurrentMonth: boolean;
  daysInMonth: number;
  daysElapsed: number;
  daysLeft: number;
  defaultBudget: number;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  percentage: number;
  dailyAverage: number;
  categoryRows: BudgetCategoryRow[];
  categoryOptions: BudgetCategoryOption[];
  totalCategoryBudget: number;
  budgetedCategorySpend: number;
  health: FinancialHealth;
  focusCategory: string | null;
  notice: BudgetNotice | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sumAmounts(rows: { amount: number | string }[]) {
  return rows.reduce((total, row) => total + (Number(row.amount) || 0), 0);
}

export async function getBudgetsData(
  params: SearchParams,
): Promise<BudgetsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fbudgets");
  }

  const now = new Date();
  const currentMonth = currentMonthKey();
  const monthKey = normalizeMonthKey(first(params.month), currentMonth);
  const { start, nextStart, daysInMonth } = monthRange(monthKey);

  const isCurrentMonth = monthKey === currentMonth;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

  const [
    settingsResult,
    budgetResult,
    categoriesResult,
    categoryBudgetsResult,
    expensesResult,
  ] = await Promise.all([
    supabase
      .from("user_settings")
      .select("display_name, currency, default_monthly_budget")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .limit(1),
    supabase
      .from("categories")
      .select("id, name, emoji, color, kind")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("category_budgets")
      .select("category_name, category_id, amount")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .order("category_name"),
    supabase
      .from("transactions")
      .select("category, amount, date")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", start)
      .lt("date", nextStart),
  ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (budgetResult.error) {
    throw new Error(`Could not load budget: ${budgetResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(
      `Could not load categories: ${categoriesResult.error.message}`,
    );
  }

  if (categoryBudgetsResult.error) {
    throw new Error(
      `Could not load category budgets: ${categoryBudgetsResult.error.message}`,
    );
  }

  if (expensesResult.error) {
    throw new Error(
      `Could not load transactions: ${expensesResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";
  const defaultBudget = Number(settings?.default_monthly_budget ?? 0) || 0;
  const monthlyBudget =
    Number(budgetResult.data?.[0]?.amount ?? 0) || defaultBudget;
  const expenses = expensesResult.data ?? [];

  const categorySpend = new Map<string, number>();

  for (const expense of expenses) {
    const name = String(expense.category || "Other");
    categorySpend.set(
      name,
      (categorySpend.get(name) ?? 0) + (Number(expense.amount) || 0),
    );
  }

  const userCategories: BudgetCategoryOption[] = (
    categoriesResult.data ?? []
  ).map((category) => ({
    id: Number(category.id),
    name: String(category.name),
    emoji: categoryEmoji(
      String(category.name),
      (category.emoji as string | null) ?? null,
    ),
    color: categoryColor(
      String(category.name),
      (category.color as string | null) ?? null,
    ),
    kind: isCategoryKind(String(category.kind))
      ? (String(category.kind) as "expense" | "income" | "both")
      : defaultCategoryKind(String(category.name)),
  }));

  const categorizedBudgetRows = (categoryBudgetsResult.data ?? []).map(
    (row) => ({
      name: String(row.category_name ?? "Other"),
      categoryId:
        row.category_id === null || row.category_id === undefined
          ? null
          : Number(row.category_id),
      budget: Number(row.amount) || 0,
    }),
  );

  const categoryRows: BudgetCategoryRow[] = categorizedBudgetRows
    .map((row) => {
      const userCategory = userCategories.find(
        (category) => category.name === row.name,
      );
      const spent = categorySpend.get(row.name) ?? 0;
      const budget = row.budget;

      return {
        name: row.name,
        emoji: userCategory?.emoji ?? categoryEmoji(row.name),
        color: userCategory?.color ?? categoryColor(row.name),
        categoryId: row.categoryId,
        spent,
        budget,
        percentage: budget > 0 ? (spent / budget) * 100 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const optionMap = new Map<string, BudgetCategoryOption>();

  // Budgets track spending, so income-only categories have no place here.
  for (const name of DEFAULT_CATEGORY_NAMES) {
    if (defaultCategoryKind(name) === "income") continue;

    optionMap.set(name, {
      id: null,
      name,
      emoji: categoryEmoji(name),
      color: categoryColor(name),
      kind: defaultCategoryKind(name),
    });
  }

  for (const category of userCategories) {
    if (category.kind === "income") continue;

    optionMap.set(category.name, category);
  }

  for (const row of categoryRows) {
    if (!optionMap.has(row.name)) {
      optionMap.set(row.name, {
        id: row.categoryId,
        name: row.name,
        emoji: row.emoji,
        color: row.color,
        kind: "both",
      });
    }
  }

  const categoryOptions = [...optionMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const totalCategoryBudget = categoryRows.reduce(
    (total, row) => total + row.budget,
    0,
  );
  const budgetedCategorySpend = categoryRows.reduce(
    (total, row) => total + row.spent,
    0,
  );

  const spent = sumAmounts(expenses);
  const remaining = monthlyBudget - spent;
  const percentage = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;

  const healthProgress: CategoryBudgetProgress[] = categoryRows.map((row) => ({
    name: row.name,
    spent: row.spent,
    budget: row.budget,
    percentage: row.percentage,
  }));

  const saved = first(params.saved);
  const deleted = first(params.deleted);
  const errorMessage = first(params.error);

  const notice: BudgetNotice | null = errorMessage
    ? { type: "error", message: errorMessage.slice(0, 200) }
    : saved === "budget"
      ? { type: "success", message: "Monthly budget saved." }
      : saved === "category"
        ? { type: "success", message: "Category budget saved." }
        : saved === "copied"
          ? {
              type: "success",
              message: "Copied last month's budget plan into this month.",
            }
          : deleted === "category"
            ? { type: "success", message: "Category budget removed." }
            : null;

  const nextMonth = shiftMonth(monthKey, 1);
  const focusCategory = (first(params.category) ?? "").trim().slice(0, 60);

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
    monthKey,
    monthLabel: monthLabel(monthKey),
    previousMonth: shiftMonth(monthKey, -1),
    nextMonth,
    nextDisabled: nextMonth > currentMonth,
    isCurrentMonth,
    daysInMonth,
    daysElapsed,
    daysLeft: Math.max(daysInMonth - daysElapsed, 0),
    defaultBudget,
    monthlyBudget,
    spent,
    remaining,
    percentage,
    dailyAverage: daysElapsed > 0 ? spent / daysElapsed : 0,
    categoryRows,
    categoryOptions,
    totalCategoryBudget,
    budgetedCategorySpend,
    health: calculateFinancialHealth(
      expenses.map((expense) => ({
        amount: expense.amount,
        date: String(expense.date),
      })),
      monthlyBudget,
      healthProgress,
    ),
    focusCategory:
      focusCategory &&
      categoryOptions.some((option) => option.name === focusCategory)
        ? focusCategory
        : null,
    notice,
  };
}
