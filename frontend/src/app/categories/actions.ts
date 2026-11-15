"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DEFAULT_CATEGORY_NAMES } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export type CategoryFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function categoriesUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/categories?${query}` : "/categories";
}

function revalidateCategoryAreas() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

function friendlyError(message: string) {
  const text = message.toLowerCase();

  if (text.includes("duplicate") || text.includes("unique")) {
    return "You already have a category with this name.";
  }

  return message;
}

export async function saveCategory(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const id = readText(formData, "id");
  const name = readText(formData, "name").replace(/\s+/g, " ");
  const emoji = readText(formData, "emoji");

  if (!name) {
    return { error: "Enter a category name." };
  }

  if (name.length > 60) {
    return { error: "Category name must be 60 characters or fewer." };
  }

  if (emoji.length > 16) {
    return { error: "Use a single emoji (or leave it empty)." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fcategories");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id);

  if (existingError) {
    return { error: `Could not check your categories: ${existingError.message}` };
  }

  const duplicate = (existingRows ?? []).find(
    (row) =>
      String(row.name).toLowerCase() === name.toLowerCase() &&
      String(row.id) !== id,
  );

  if (duplicate) {
    return { error: "You already have a category with this name." };
  }

  const currentCategory = id
    ? (existingRows ?? []).find((row) => String(row.id) === id)
    : undefined;
  const builtInClash =
    DEFAULT_CATEGORY_NAMES.some(
      (categoryName) => categoryName.toLowerCase() === name.toLowerCase(),
    ) &&
    currentCategory?.name?.toLowerCase() !== name.toLowerCase();

  if (builtInClash) {
    return {
      error:
        "That name is already a built-in category. Pick a different name to keep your categories distinct.",
    };
  }

  const record = {
    name,
    emoji: emoji || null,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That category could not be found." };
    }

    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (categoryError) {
      return { error: `Could not update the category: ${categoryError.message}` };
    }

    if (!categoryRow) {
      return { error: "That category could not be found." };
    }

    const { error } = await supabase
      .from("categories")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: friendlyError(`Could not update the category: ${error.message}`) };
    }

    // Keep linked transactions, archived expenses and category budgets in sync
    // with the new name.
    const [transactionSync, expenseSync, budgetSync] = await Promise.all([
      supabase
        .from("transactions")
        .update({ category: name })
        .eq("category_id", id)
        .eq("user_id", user.id),
      supabase
        .from("expenses")
        .update({ category: name })
        .eq("category_id", id)
        .eq("user_id", user.id),
      supabase
        .from("category_budgets")
        .update({ category_name: name })
        .eq("category_id", id)
        .eq("user_id", user.id),
    ]);

    if (transactionSync.error) {
      return {
        error: `Category renamed, but linked transactions could not be updated: ${transactionSync.error.message}`,
      };
    }

    if (expenseSync.error) {
      return {
        error: `Category renamed, but archived expenses could not be updated: ${expenseSync.error.message}`,
      };
    }

    if (budgetSync.error) {
      return {
        error: `Category renamed, but linked budgets could not be updated: ${budgetSync.error.message}`,
      };
    }

    revalidateCategoryAreas();
    redirect(categoriesUrl({ saved: "updated" }));
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    ...record,
  });

  if (error) {
    return { error: friendlyError(`Could not add the category: ${error.message}`) };
  }

  revalidateCategoryAreas();
  redirect(categoriesUrl({ saved: "added" }));
}

export async function deleteCategory(formData: FormData) {
  const id = readText(formData, "id");

  if (!/^\d+$/.test(id)) {
    redirect(categoriesUrl({ error: "That category could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fcategories");
  }

  const { data: categoryRow, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (categoryError) {
    redirect(
      categoriesUrl({
        error: `Could not load the category: ${categoryError.message}`,
      }),
    );
  }

  if (!categoryRow) {
    redirect(categoriesUrl({ error: "That category could not be found." }));
  }

  // 1. Move linked transactions to the built-in Other category, and keep the
  // archived expenses table consistent too.
  const [transactionMove, expenseMove] = await Promise.all([
    supabase
      .from("transactions")
      .update({ category: "Other", category_id: null })
      .eq("category_id", id)
      .eq("user_id", user.id),
    supabase
      .from("expenses")
      .update({ category: "Other", category_id: null })
      .eq("category_id", id)
      .eq("user_id", user.id),
  ]);

  if (transactionMove.error) {
    redirect(
      categoriesUrl({
        error: `Could not move linked transactions: ${transactionMove.error.message}`,
      }),
    );
  }

  if (expenseMove.error) {
    redirect(
      categoriesUrl({
        error: `Could not move archived expenses: ${expenseMove.error.message}`,
      }),
    );
  }

  // 2. Remove any category budgets that point at this category.
  const [byId, byName] = await Promise.all([
    supabase
      .from("category_budgets")
      .delete()
      .eq("category_id", id)
      .eq("user_id", user.id),
    supabase
      .from("category_budgets")
      .delete()
      .eq("category_name", String(categoryRow.name))
      .eq("user_id", user.id),
  ]);

  if (byId.error || byName.error) {
    redirect(
      categoriesUrl({
        error: `Could not remove linked budgets: ${
          byId.error?.message ?? byName.error?.message
        }`,
      }),
    );
  }

  // 3. Delete the category itself.
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      categoriesUrl({ error: `Could not delete the category: ${error.message}` }),
    );
  }

  revalidateCategoryAreas();
  redirect(categoriesUrl({ deleted: "1" }));
}
