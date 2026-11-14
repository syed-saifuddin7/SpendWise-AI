import "server-only";

import { redirect } from "next/navigation";

import { DEFAULT_CATEGORY_NAMES } from "@/lib/categories";
import {
  currentMonthKey,
  monthLabel,
  monthRange,
  normalizeMonthKey,
  shiftMonth,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseRecord } from "@/lib/types";

export type TransactionCategory = {
  id: number | null;
  name: string;
  emoji: string | null;
};

export type TransactionsData = {
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
  expenses: ExpenseRecord[];
  monthExpenses: ExpenseRecord[];
  totalSpent: number;
  monthTotal: number;
  count: number;
  monthCount: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
  categories: TransactionCategory[];
  filterCategories: string[];
  categoryFilter: string | null;
  query: string;
  addMode: boolean;
  editingExpense: ExpenseRecord | null;
  notice: { type: "success" | "error"; message: string } | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sum(records: ExpenseRecord[]) {
  return records.reduce(
    (total, record) => total + (Number(record.amount) || 0),
    0,
  );
}

export async function getTransactionsData(
  params: SearchParams,
): Promise<TransactionsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Ftransactions");
  }

  const today = new Date();
  const currentMonth = currentMonthKey();
  const monthKey = normalizeMonthKey(first(params.month), currentMonth);
  const query = (first(params.q) ?? "").trim().slice(0, 80);
  const categoryFilter =
    (first(params.category) ?? "").trim().slice(0, 60) || null;

  const { start, nextStart, daysInMonth } = monthRange(monthKey);

  const [settingsResult, categoriesResult, expensesResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("display_name, currency")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("categories")
      .select("id, name, emoji")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", nextStart)
      .order("date", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (expensesResult.error) {
    throw new Error(`Could not load expenses: ${expensesResult.error.message}`);
  }

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(`Could not load categories: ${categoriesResult.error.message}`);
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";
  const monthExpenses = (expensesResult.data ?? []) as ExpenseRecord[];

  const userCategories: TransactionCategory[] = (
    categoriesResult.data ?? []
  ).map((category) => ({
    id: Number(category.id),
    name: String(category.name),
    emoji: (category.emoji as string | null) ?? null,
  }));

  let expenses = monthExpenses;

  if (categoryFilter) {
    expenses = expenses.filter(
      (expense) => expense.category === categoryFilter,
    );
  }

  if (query) {
    const needle = query.toLowerCase();

    expenses = expenses.filter((expense) =>
      [expense.name, expense.description ?? "", expense.category].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }

  const monthTotal = sum(monthExpenses);
  const totalSpent = sum(expenses);

  const isCurrentMonth = monthKey === currentMonth;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

  const categoryTotals = new Map<string, number>();

  for (const expense of monthExpenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) ?? 0) +
        (Number(expense.amount) || 0),
    );
  }

  const topCategory = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)[0] ?? null;

  const filterCategories = [
    ...new Set([
      ...userCategories.map((category) => category.name),
      ...monthExpenses.map((expense) => expense.category).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const categories: TransactionCategory[] = (() => {
    const options = new Map<string, TransactionCategory>();

    for (const name of DEFAULT_CATEGORY_NAMES) {
      options.set(name, { id: null, name, emoji: null });
    }

    for (const category of userCategories) {
      options.set(category.name, category);
    }

    for (const expense of monthExpenses) {
      if (expense.category && !options.has(expense.category)) {
        options.set(expense.category, {
          id: null,
          name: expense.category,
          emoji: null,
        });
      }
    }

    return [...options.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  })();

  const editingId = first(params.edit);
  const editingExpense = editingId
    ? (monthExpenses.find((expense) => String(expense.id) === editingId) ??
      null)
    : null;

  const noticeType = first(params.error)
    ? "error"
    : first(params.saved)
      ? "success"
      : first(params.deleted)
        ? "success"
        : null;

  const notice =
    noticeType === "error"
      ? {
          type: "error" as const,
          message:
            first(params.error) ?? "Something went wrong. Please try again.",
        }
      : noticeType === "success"
        ? {
            type: "success" as const,
            message: first(params.saved)
              ? "Expense saved."
              : "Expense deleted.",
          }
        : null;

  const nextMonth = shiftMonth(monthKey, 1);

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
    expenses,
    monthExpenses,
    totalSpent,
    monthTotal,
    count: expenses.length,
    monthCount: monthExpenses.length,
    dailyAverage: daysElapsed > 0 ? totalSpent / daysElapsed : 0,
    topCategory,
    categories,
    filterCategories,
    categoryFilter,
    query,
    addMode: first(params.add) === "1",
    editingExpense,
    notice,
  };
}
