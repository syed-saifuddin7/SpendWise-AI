"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { TRANSFER_CATEGORY_NAME } from "@/lib/categories";
import { isValidDateKey, monthKeyOf } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { isTransactionType, type TransactionType } from "@/lib/types";

export type TransactionFormState = { error: string } | undefined;

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

function revalidateTransactionAreas() {
  revalidatePath("/transactions");
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/categories");
  revalidatePath("/analytics");
  revalidatePath("/monthly-summary");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function saveTransaction(
  _previousState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const id = readText(formData, "id");
  const rawType = readText(formData, "type") || "expense";
  const name = readText(formData, "name");
  const amountValue = readText(formData, "amount");
  const category = readText(formData, "category");
  const date = readText(formData, "date");
  const description = readText(formData, "description");
  const walletValue = readText(formData, "wallet_id");
  const transferWalletValue = readText(formData, "transfer_wallet_id");

  if (!isTransactionType(rawType)) {
    return { error: "Choose a valid transaction type." };
  }

  const type: TransactionType = rawType;

  if (!name) {
    return {
      error:
        type === "transfer"
          ? "Give this transfer a name, like “Move to savings”."
          : `Enter a name for this ${type}.`,
    };
  }

  if (name.length > 120) {
    return { error: "Transaction name must be 120 characters or fewer." };
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

  if (type !== "transfer") {
    if (!category) {
      return { error: "Choose a category." };
    }

    if (category.length > 60) {
      return { error: "Category name must be 60 characters or fewer." };
    }
  }

  if (description.length > 500) {
    return { error: "Description must be 500 characters or fewer." };
  }

  const walletId = /^\d+$/.test(walletValue) ? Number(walletValue) : null;
  const transferWalletId = /^\d+$/.test(transferWalletValue)
    ? Number(transferWalletValue)
    : null;

  if (walletValue && walletId === null) {
    return { error: "Choose a valid wallet." };
  }

  if (transferWalletValue && transferWalletId === null) {
    return { error: "Choose a valid destination wallet." };
  }

  if (type === "transfer") {
    if (!walletId) {
      return { error: "Choose the wallet the money leaves." };
    }

    if (!transferWalletId) {
      return { error: "Choose the wallet the money arrives in." };
    }

    if (walletId === transferWalletId) {
      return { error: "A transfer needs two different wallets." };
    }
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Ftransactions");
  }

  const walletIds = [
    ...new Set([walletId, transferWalletId].filter((value): value is number => Boolean(value))),
  ];

  if (walletIds.length) {
    const { data: walletRows, error: walletError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .in("id", walletIds);

    if (walletError) {
      return { error: `Could not check your wallets: ${walletError.message}` };
    }

    if ((walletRows ?? []).length !== walletIds.length) {
      return { error: "One of those wallets could not be found." };
    }
  }

  const categoryName =
    type === "transfer" ? TRANSFER_CATEGORY_NAME : category;

  let categoryId: number | null = null;

  if (type !== "transfer") {
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", categoryName)
      .limit(1)
      .maybeSingle();

    if (categoryError) {
      return { error: `Could not save the transaction: ${categoryError.message}` };
    }

    categoryId = categoryRow?.id ?? null;
  }

  const record = {
    type,
    name,
    amount,
    category: categoryName,
    category_id: categoryId,
    description,
    date,
    wallet_id: walletId,
    transfer_wallet_id: type === "transfer" ? transferWalletId : null,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That transaction could not be found." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return { error: `Could not update the transaction: ${existingError.message}` };
    }

    if (!existing) {
      return { error: "That transaction could not be found." };
    }

    const { error } = await supabase
      .from("transactions")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: `Could not update the transaction: ${error.message}` };
    }
  } else {
    const { error } = await supabase.from("transactions").insert({
      ...record,
      user_id: user.id,
    });

    if (error) {
      return { error: `Could not save the transaction: ${error.message}` };
    }
  }

  revalidateTransactionAreas();

  redirect(transactionsUrl(date.slice(0, 7), { saved: "1" }));
}

export async function deleteTransaction(formData: FormData) {
  const id = readText(formData, "id");
  const month = validMonth(readText(formData, "month"));

  if (!/^\d+$/.test(id)) {
    redirect(transactionsUrl(month, { error: "That transaction could not be found." }));
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
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      transactionsUrl(month, {
        error: `Could not delete the transaction: ${error.message}`,
      }),
    );
  }

  revalidateTransactionAreas();

  redirect(transactionsUrl(month, { deleted: "1" }));
}
