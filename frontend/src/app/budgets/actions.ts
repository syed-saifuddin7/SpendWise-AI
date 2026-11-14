"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { monthKeyOf } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type BudgetFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : monthKeyOf(new Date());
}

function budgetsUrl(monthKey: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ month: monthKey });

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  return `/budgets?${search.toString()}`;
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (amount > 1_000_000_000) {
    return null;
  }

  return amount;
}

async function requireUser(nextPath = "%2Fbudgets") {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=${nextPath}`);
  }

  return { supabase, user };
}

function revalidateBudgetAreas() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function saveMonthlyBudget(
  _previousState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const month = validMonth(readText(formData, "month"));
  const amount = parseAmount(readText(formData, "amount"));

  if (amount === null) {
    return { error: "Enter a monthly budget greater than 0." };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      month,
      amount,
    },
    { onConflict: "user_id,month" },
  );

  if (error) {
    return { error: `Could not save the budget: ${error.message}` };
  }

  revalidateBudgetAreas();
  redirect(budgetsUrl(month, { saved: "budget" }));
}

export async function saveCategoryBudget(
  _previousState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const month = validMonth(readText(formData, "month"));
  const categoryName = readText(formData, "category");
  const amount = parseAmount(readText(formData, "amount"));

  if (!categoryName) {
    return { error: "Choose a category." };
  }

  if (categoryName.length > 60) {
    return { error: "Category name must be 60 characters or fewer." };
  }

  if (amount === null) {
    return { error: "Enter a category budget greater than 0." };
  }

  const { supabase, user } = await requireUser();

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", categoryName)
    .limit(1)
    .maybeSingle();

  if (categoryError) {
    return {
      error: `Could not save the category budget: ${categoryError.message}`,
    };
  }

  const { error } = await supabase.from("category_budgets").upsert(
    {
      user_id: user.id,
      category_name: categoryName,
      category_id: categoryRow?.id ?? null,
      month,
      amount,
    },
    { onConflict: "user_id,category_name,month" },
  );

  if (error) {
    return {
      error: `Could not save the category budget: ${error.message}`,
    };
  }

  revalidateBudgetAreas();
  revalidatePath("/transactions");

  redirect(`${budgetsUrl(month, { saved: "category" })}#category-budget-form`);
}

export async function deleteCategoryBudget(formData: FormData) {
  const month = validMonth(readText(formData, "month"));
  const categoryName = readText(formData, "category");

  if (!categoryName) {
    redirect(
      budgetsUrl(month, {
        error: "That category budget could not be found.",
      }),
    );
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category_name", categoryName)
    .eq("month", month);

  if (error) {
    redirect(
      budgetsUrl(month, {
        error: `Could not remove the category budget: ${error.message}`,
      }),
    );
  }

  revalidateBudgetAreas();

  redirect(budgetsUrl(month, { deleted: "category" }));
}

export async function copyPreviousMonthBudget(formData: FormData) {
  const month = validMonth(readText(formData, "month"));
  const previousMonth = (() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(year, monthNumber - 2, 1);
    return monthKeyOf(date);
  })();

  const { supabase, user } = await requireUser();

  const [budgetResult, categoryBudgetsResult] = await Promise.all([
    supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", previousMonth)
      .limit(1),
    supabase
      .from("category_budgets")
      .select("category_name, category_id, amount")
      .eq("user_id", user.id)
      .eq("month", previousMonth),
  ]);

  if (budgetResult.error) {
    redirect(
      budgetsUrl(month, {
        error: `Could not read last month's budget: ${budgetResult.error.message}`,
      }),
    );
  }

  if (categoryBudgetsResult.error) {
    redirect(
      budgetsUrl(month, {
        error: `Could not read last month's category budgets: ${categoryBudgetsResult.error.message}`,
      }),
    );
  }

  const previousBudget = Number(budgetResult.data?.[0]?.amount ?? 0) || 0;
  const previousCategoryBudgets = categoryBudgetsResult.data ?? [];

  if (previousBudget <= 0 && !previousCategoryBudgets.length) {
    redirect(
      budgetsUrl(month, {
        error: "There is no budget from last month to copy.",
      }),
    );
  }

  if (previousBudget > 0) {
    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        month,
        amount: previousBudget,
      },
      { onConflict: "user_id,month" },
    );

    if (error) {
      redirect(
        budgetsUrl(month, {
          error: `Could not copy the budget: ${error.message}`,
        }),
      );
    }
  }

  if (previousCategoryBudgets.length) {
    const { error } = await supabase.from("category_budgets").upsert(
      previousCategoryBudgets.map((row) => ({
        user_id: user.id,
        month,
        category_name: row.category_name,
        category_id: row.category_id ?? null,
        amount: Number(row.amount) || 0,
      })),
      { onConflict: "user_id,category_name,month" },
    );

    if (error) {
      redirect(
        budgetsUrl(month, {
          error: `Could not copy the category budgets: ${error.message}`,
        }),
      );
    }
  }

  revalidateBudgetAreas();

  redirect(budgetsUrl(month, { saved: "copied" }));
}
