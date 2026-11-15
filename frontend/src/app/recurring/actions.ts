"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidDateKey, todayKey } from "@/lib/dates";
import {
  isRecurringFrequency,
  nextOccurrence,
  type RecurringFrequency,
} from "@/lib/recurring";
import { createClient } from "@/lib/supabase/server";

export type RecurringFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function recurringUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/recurring?${query}` : "/recurring";
}

function revalidateRecurringAreas() {
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
  revalidatePath("/monthly-summary");
}

function friendlyError(message: string) {
  const text = message.toLowerCase();

  if (text.includes("duplicate") || text.includes("unique")) {
    return "A recurring expense with that name already exists.";
  }

  return message;
}

export async function saveRecurring(
  _previousState: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const id = readText(formData, "id");
  const name = readText(formData, "name").replace(/\s+/g, " ");
  const amountValue = readText(formData, "amount");
  const category = readText(formData, "category");
  const description = readText(formData, "description");
  const frequencyValue = readText(formData, "frequency") || "monthly";
  const startDate = readText(formData, "start_date");

  if (!name) {
    return { error: "Enter a name for this recurring expense." };
  }

  if (name.length > 120) {
    return { error: "Name must be 120 characters or fewer." };
  }

  const amount = Number(amountValue.replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  if (amount > 1_000_000_000) {
    return { error: "That amount looks too large. Enter a smaller value." };
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

  if (!isRecurringFrequency(frequencyValue)) {
    return { error: "Choose a valid frequency." };
  }

  const frequency: RecurringFrequency = frequencyValue;

  if (!isValidDateKey(startDate)) {
    return { error: "Choose a valid start date." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Frecurring");
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", category)
    .limit(1)
    .maybeSingle();

  if (categoryError) {
    return {
      error: `Could not save the recurring expense: ${categoryError.message}`,
    };
  }

  // Mirrors the Python app: the first run is one full interval after the
  // start date, so a plan beginning today bills on the next cycle.
  const nextRunDate = nextOccurrence(startDate, frequency);

  const record = {
    name,
    amount,
    category,
    category_id: categoryRow?.id ?? null,
    description,
    frequency,
    start_date: startDate,
    next_run_date: nextRunDate,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That recurring expense could not be found." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("recurring_expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return {
        error: `Could not update the recurring expense: ${existingError.message}`,
      };
    }

    if (!existing) {
      return { error: "That recurring expense could not be found." };
    }

    const { error } = await supabase
      .from("recurring_expenses")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return {
        error: friendlyError(
          `Could not update the recurring expense: ${error.message}`,
        ),
      };
    }

    revalidateRecurringAreas();
    redirect(recurringUrl({ saved: "updated" }));
  }

  const { error } = await supabase.from("recurring_expenses").insert({
    ...record,
    user_id: user.id,
    is_active: true,
    last_generated_date: null,
  });

  if (error) {
    return {
      error: friendlyError(
        `Could not add the recurring expense: ${error.message}`,
      ),
    };
  }

  revalidateRecurringAreas();
  redirect(recurringUrl({ saved: "added" }));
}

export async function toggleRecurring(formData: FormData) {
  const id = readText(formData, "id");
  const active = readText(formData, "active") === "1";

  if (!/^\d+$/.test(id)) {
    redirect(recurringUrl({ error: "That recurring expense could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Frecurring");
  }

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ is_active: active })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      recurringUrl({
        error: `Could not update the recurring expense: ${error.message}`,
      }),
    );
  }

  revalidateRecurringAreas();
  redirect(recurringUrl(active ? { resumed: "1" } : { paused: "1" }));
}

export async function deleteRecurring(formData: FormData) {
  const id = readText(formData, "id");

  if (!/^\d+$/.test(id)) {
    redirect(recurringUrl({ error: "That recurring expense could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Frecurring");
  }

  // Generated transactions detach automatically (`ON DELETE SET NULL`), but the
  // archived `expenses` table cascades on delete. Detach those rows first so
  // the delete only removes the schedule.
  const { error: detachError } = await supabase
    .from("expenses")
    .update({ recurring_expense_id: null })
    .eq("recurring_expense_id", id)
    .eq("user_id", user.id);

  if (detachError) {
    redirect(
      recurringUrl({
        error: `Could not keep the generated expenses: ${detachError.message}`,
      }),
    );
  }

  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      recurringUrl({
        error: `Could not delete the recurring expense: ${error.message}`,
      }),
    );
  }

  revalidateRecurringAreas();
  redirect(recurringUrl({ deleted: "1" }));
}

/**
 * Mirrors `process_due_recurring_expenses` in `cloud_db.py`: create one expense
 * transaction per due item for its `next_run_date`, then advance that item one
 * interval. Duplicate protection on (recurring_expense_id, date) keeps repeat
 * clicks safe.
 */
export async function processDueRecurring() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Frecurring");
  }

  const today = todayKey();

  const { data: dueItems, error: dueError } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .lte("next_run_date", today)
    .order("next_run_date", { ascending: true });

  if (dueError) {
    redirect(
      recurringUrl({
        error: `Could not load due recurring expenses: ${dueError.message}`,
      }),
    );
  }

  let created = 0;

  // Recurring plans do not pin a wallet yet, so generated expenses land in the
  // user's first active wallet. Plans still work without one (wallet_id null).
  const { data: walletRows, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(1);

  if (walletError) {
    redirect(
      recurringUrl({
        error: `Could not load your wallets: ${walletError.message}`,
      }),
    );
  }

  const walletId = walletRows?.[0]?.id ? Number(walletRows[0].id) : null;

  for (const item of dueItems ?? []) {
    const nextRunDate = String(item.next_run_date);

    const { data: existing, error: existingError } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("recurring_expense_id", item.id)
      .eq("date", nextRunDate)
      .limit(1);

    if (existingError) {
      redirect(
        recurringUrl({
          error: `Could not check generated transactions: ${existingError.message}`,
        }),
      );
    }

    if (!existing?.length) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          name: item.name,
          amount: item.amount,
          category: item.category,
          category_id: item.category_id ?? null,
          description: item.description ?? "",
          date: nextRunDate,
          wallet_id: walletId,
          recurring_expense_id: item.id,
        });

      if (insertError) {
        redirect(
          recurringUrl({
            error: `Could not generate a transaction: ${insertError.message}`,
          }),
        );
      }

      created += 1;
    }

    const frequency = isRecurringFrequency(String(item.frequency))
      ? String(item.frequency)
      : "monthly";
    const advanced = nextOccurrence(nextRunDate, frequency);

    if (advanced === nextRunDate) {
      continue;
    }

    const { error: advanceError } = await supabase
      .from("recurring_expenses")
      .update({
        last_generated_date: nextRunDate,
        next_run_date: advanced,
      })
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (advanceError) {
      redirect(
        recurringUrl({
          error: `Could not advance the schedule: ${advanceError.message}`,
        }),
      );
    }
  }

  revalidateRecurringAreas();
  redirect(recurringUrl({ processed: String(created) }));
}
