"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { monthKeyOf, isValidDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type ExpenseFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function transactionsUrl(monthKey: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ month: monthKey });

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  return `/transactions?${search.toString()}`;
}

function validMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : monthKeyOf(new Date());
}

export async function saveExpense(
  _previousState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const id = readText(formData, "id");
  const name = readText(formData, "name");
  const amountValue = readText(formData, "amount");
  const category = readText(formData, "category");
  const date = readText(formData, "date");
  const description = readText(formData, "description");

  if (!name) {
    return { error: "Enter a name for this expense." };
  }

  if (name.length > 120) {
    return { error: "Expense name must be 120 characters or fewer." };
  }

  const amount = Number(amountValue.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  if (amount > 1_000_000_000) {
    return { error: "That amount looks too large. Enter a smaller value." };
  }

  if (!isValidDateKey(date)) {
    return { error: "Choose a valid date." };
  }

  if (!category) {
    return { error: "Choose a category." };
  }

  if (category.length > 60) {
    return { error: "Category name must be 60 characters or fewer." };
  }

  if (description.length > 500) {
    return { error: "Description must be 500 characters or fewer." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Ftransactions");
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", category)
    .limit(1)
    .maybeSingle();

  if (categoryError) {
    return { error: `Could not save the expense: ${categoryError.message}` };
  }

  const record = {
    name,
    amount,
    category,
    date,
    description,
    category_id: categoryRow?.id ?? null,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That expense could not be found." };
    }

    const { error } = await supabase
      .from("expenses")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: `Could not update the expense: ${error.message}` };
    }
  } else {
    const { error } = await supabase.from("expenses").insert({
      ...record,
      user_id: user.id,
    });

    if (error) {
      return { error: `Could not save the expense: ${error.message}` };
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  redirect(transactionsUrl(date.slice(0, 7), { saved: "1" }));
}

export async function deleteExpense(formData: FormData) {
  const id = readText(formData, "id");
  const month = validMonth(readText(formData, "month"));

  if (!/^\d+$/.test(id)) {
    redirect(transactionsUrl(month, { error: "That expense could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Ftransactions");
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      transactionsUrl(month, {
        error: `Could not delete the expense: ${error.message}`,
      }),
    );
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  redirect(transactionsUrl(month, { deleted: "1" }));
}
