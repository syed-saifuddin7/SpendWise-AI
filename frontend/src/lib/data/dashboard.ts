import "server-only";

import { redirect } from "next/navigation";

import {
  calculateFinancialHealth,
  type CategoryBudgetProgress,
  type FinancialHealth,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseRecord } from "@/lib/types";

export type { ExpenseRecord };

export type CategoryTotal = {
  name: string;
  amount: number;
  percentage: number;
};

export type DashboardData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  monthKey: string;
  monthLabel: string;
  dayOfMonth: number;
  daysInMonth: number;
  daysElapsed: number;
  expenses: ExpenseRecord[];
  recent: ExpenseRecord[];
  totalSpent: number;
  transactionCount: number;
  dailyAverage: number;
  budget: number;
  budgetLeft: number;
  budgetPercentage: number;
  dailyTotals: number[];
  categories: CategoryTotal[];
  categoryBudgets: CategoryBudgetProgress[];
  health: FinancialHealth;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDayOfMonth(date: string) {
  const day = Number(date.slice(8, 10));
  return Number.isFinite(day) && day > 0 ? day : null;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;
  const monthStart = `${monthKey}-01`;

  const nextMonth = new Date(year, month + 1, 1);
  const nextMonthStart = `${nextMonth.getFullYear()}-${pad(
    nextMonth.getMonth() + 1,
  )}-01`;

  const [expensesResult, budgetResult, settingsResult, categoryBudgetsResult] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lt("date", nextMonthStart)
        .order("date", { ascending: false }),
      supabase
        .from("budgets")
        .select("amount")
        .eq("user_id", user.id)
        .eq("month", monthKey)
        .limit(1),
      supabase
        .from("user_settings")
        .select("display_name, currency, default_monthly_budget")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("category_budgets")
        .select("category_name, amount")
        .eq("user_id", user.id)
        .eq("month", monthKey)
        .order("category_name"),
    ]);

  if (expensesResult.error) {
    throw new Error(`Could not load expenses: ${expensesResult.error.message}`);
  }

  if (budgetResult.error) {
    throw new Error(`Could not load budget: ${budgetResult.error.message}`);
  }

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (categoryBudgetsResult.error) {
    throw new Error(
      `Could not load category budgets: ${categoryBudgetsResult.error.message}`,
    );
  }

  const expenses = (expensesResult.data ?? []) as ExpenseRecord[];
  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";

  const monthlyBudget =
    Number(budgetResult.data?.[0]?.amount ?? 0) ||
    Number(settings?.default_monthly_budget ?? 0) ||
    0;

  const totalSpent = expenses.reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0,
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyTotals = Array.from({ length: daysInMonth }, () => 0);

  for (const expense of expenses) {
    const day = getDayOfMonth(expense.date);

    if (day && day <= daysInMonth) {
      dailyTotals[day - 1] += Number(expense.amount) || 0;
    }
  }

  const categoryMap = new Map<string, number>();

  for (const expense of expenses) {
    const name = expense.category || "Other";
    categoryMap.set(
      name,
      (categoryMap.get(name) ?? 0) + (Number(expense.amount) || 0),
    );
  }

  const categories = [...categoryMap.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const categoryBudgets: CategoryBudgetProgress[] = (
    categoryBudgetsResult.data ?? []
  ).map((row) => {
    const name = String(row.category_name ?? "Other");
    const budget = Number(row.amount) || 0;
    const spent = categoryMap.get(name) ?? 0;

    return {
      name,
      spent,
      budget,
      percentage: budget > 0 ? (spent / budget) * 100 : 0,
    };
  });

  const budgetLeft = monthlyBudget - totalSpent;
  const budgetPercentage =
    monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  const daysElapsed = dayOfMonth;

  const displayName =
    (settings?.display_name as string | null)?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: displayName,
    },
    currency,
    monthKey,
    monthLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(now),
    dayOfMonth,
    daysInMonth,
    daysElapsed,
    expenses,
    recent: expenses.slice(0, 6),
    totalSpent,
    transactionCount: expenses.length,
    dailyAverage: daysElapsed > 0 ? totalSpent / daysElapsed : 0,
    budget: monthlyBudget,
    budgetLeft,
    budgetPercentage,
    dailyTotals,
    categories,
    categoryBudgets,
    health: calculateFinancialHealth(
      expenses,
      monthlyBudget,
      categoryBudgets,
    ),
  };
}
