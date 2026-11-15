import "server-only";

import { redirect } from "next/navigation";

import {
  DEFAULT_CATEGORY_NAMES,
  categoryColor,
  categoryEmoji,
  defaultCategoryKind,
  isCategoryKind,
  type CategoryKind,
} from "@/lib/categories";
import { currentMonthKey, monthLabel, monthRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type CategoryItem = {
  id: number | null;
  name: string;
  emoji: string;
  color: string;
  kind: CategoryKind;
  custom: boolean;
  builtIn: boolean;
  expenseCount: number;
  totalSpent: number;
  monthCount: number;
  monthSpent: number;
  incomeCount: number;
  totalIncome: number;
  monthIncomeCount: number;
  monthIncome: number;
  share: number;
};

export type CategoriesData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  monthKey: string;
  monthLabel: string;
  monthTotal: number;
  monthIncomeTotal: number;
  items: CategoryItem[];
  totalCount: number;
  customCount: number;
  usedCount: number;
  expenseKindCount: number;
  incomeKindCount: number;
  bothKindCount: number;
  addMode: boolean;
  editingCategory: CategoryItem | null;
  notice: { type: "success" | "error"; message: string } | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

type Usage = {
  expenseCount: number;
  totalSpent: number;
  monthCount: number;
  monthSpent: number;
  incomeCount: number;
  totalIncome: number;
  monthIncomeCount: number;
  monthIncome: number;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyUsage(): Usage {
  return {
    expenseCount: 0,
    totalSpent: 0,
    monthCount: 0,
    monthSpent: 0,
    incomeCount: 0,
    totalIncome: 0,
    monthIncomeCount: 0,
    monthIncome: 0,
  };
}

export async function getCategoriesData(
  params: SearchParams,
): Promise<CategoriesData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fcategories");
  }

  const monthKey = currentMonthKey();
  const { start, nextStart } = monthRange(monthKey);

  const [settingsResult, categoriesResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select("display_name, currency")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("categories")
        .select("id, name, emoji, color, kind")
        .eq("user_id", user.id)
        .order("name"),
      // Both directions matter now: an income category's job is to show what
      // came in, not what went out.
      supabase
        .from("transactions")
        .select("type, category, amount, date")
        .eq("user_id", user.id)
        .in("type", ["expense", "income"]),
    ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(
      `Could not load categories: ${categoriesResult.error.message}`,
    );
  }

  if (transactionsResult.error) {
    throw new Error(
      `Could not load transactions: ${transactionsResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";

  const usageMap = new Map<string, Usage>();
  let monthTotal = 0;
  let monthIncomeTotal = 0;

  for (const transaction of transactionsResult.data ?? []) {
    const name = String(transaction.category || "Other");
    const amount = Number(transaction.amount) || 0;
    const date = String(transaction.date ?? "");
    const inMonth = date >= start && date < nextStart;

    const usage = usageMap.get(name) ?? emptyUsage();

    if (transaction.type === "income") {
      usage.incomeCount += 1;
      usage.totalIncome += amount;

      if (inMonth) {
        usage.monthIncomeCount += 1;
        usage.monthIncome += amount;
        monthIncomeTotal += amount;
      }
    } else {
      usage.expenseCount += 1;
      usage.totalSpent += amount;

      if (inMonth) {
        usage.monthCount += 1;
        usage.monthSpent += amount;
        monthTotal += amount;
      }
    }

    usageMap.set(name, usage);
  }

  const customCategories = (categoriesResult.data ?? []).map((category) => ({
    id: Number(category.id),
    name: String(category.name),
    emoji: (category.emoji as string | null) ?? null,
    color: (category.color as string | null) ?? null,
    kind: isCategoryKind(String(category.kind))
      ? (String(category.kind) as CategoryKind)
      : defaultCategoryKind(String(category.name)),
  }));

  const customNames = new Set(customCategories.map((category) => category.name));
  const items: CategoryItem[] = [];

  const itemUsage = (name: string) => usageMap.get(name) ?? emptyUsage();

  for (const category of customCategories) {
    const usage = itemUsage(category.name);

    items.push({
      id: category.id,
      name: category.name,
      emoji: categoryEmoji(category.name, category.emoji),
      color: categoryColor(category.name, category.color),
      kind: category.kind,
      custom: true,
      builtIn: false,
      expenseCount: usage.expenseCount,
      totalSpent: usage.totalSpent,
      monthCount: usage.monthCount,
      monthSpent: usage.monthSpent,
      incomeCount: usage.incomeCount,
      totalIncome: usage.totalIncome,
      monthIncomeCount: usage.monthIncomeCount,
      monthIncome: usage.monthIncome,
      share: 0,
    });
  }

  for (const name of DEFAULT_CATEGORY_NAMES) {
    if (customNames.has(name)) continue;

    const usage = itemUsage(name);

    items.push({
      id: null,
      name,
      emoji: categoryEmoji(name),
      color: categoryColor(name),
      kind: defaultCategoryKind(name),
      custom: false,
      builtIn: true,
      expenseCount: usage.expenseCount,
      totalSpent: usage.totalSpent,
      monthCount: usage.monthCount,
      monthSpent: usage.monthSpent,
      incomeCount: usage.incomeCount,
      totalIncome: usage.totalIncome,
      monthIncomeCount: usage.monthIncomeCount,
      monthIncome: usage.monthIncome,
      share: 0,
    });
  }

  for (const [name, usage] of usageMap) {
    if (customNames.has(name)) continue;
    if (DEFAULT_CATEGORY_NAMES.includes(name)) continue;

    items.push({
      id: null,
      name,
      emoji: categoryEmoji(name),
      color: categoryColor(name),
      kind: defaultCategoryKind(name),
      custom: false,
      builtIn: false,
      expenseCount: usage.expenseCount,
      totalSpent: usage.totalSpent,
      monthCount: usage.monthCount,
      monthSpent: usage.monthSpent,
      incomeCount: usage.incomeCount,
      totalIncome: usage.totalIncome,
      monthIncomeCount: usage.monthIncomeCount,
      monthIncome: usage.monthIncome,
      share: 0,
    });
  }

  for (const item of items) {
    item.share = monthTotal > 0 ? (item.monthSpent / monthTotal) * 100 : 0;
  }

  items.sort(
    (a, b) =>
      b.monthSpent - a.monthSpent ||
      b.totalSpent - a.totalSpent ||
      b.monthIncome - a.monthIncome ||
      Number(b.custom) - Number(a.custom) ||
      a.name.localeCompare(b.name),
  );

  const editingId = first(params.edit);
  const editingCategory =
    editingId && /^\d+$/.test(editingId)
      ? (items.find(
          (item) => item.custom && String(item.id) === editingId,
        ) ?? null)
      : null;

  const errorMessage = first(params.error);
  const saved = first(params.saved);
  const deleted = first(params.deleted);

  const notice = errorMessage
    ? { type: "error" as const, message: errorMessage.slice(0, 200) }
    : saved === "added"
      ? { type: "success" as const, message: "Category added." }
      : saved === "updated"
        ? { type: "success" as const, message: "Category updated." }
        : deleted === "1"
          ? {
              type: "success" as const,
              message:
                "Category deleted. Linked transactions moved to Other and its budgets were removed.",
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
    monthKey,
    monthLabel: monthLabel(monthKey),
    monthTotal,
    monthIncomeTotal,
    items,
    totalCount: items.length,
    customCount: customCategories.length,
    usedCount: items.filter(
      (item) => item.monthCount > 0 || item.monthIncomeCount > 0,
    ).length,
    expenseKindCount: items.filter((item) => item.kind === "expense").length,
    incomeKindCount: items.filter((item) => item.kind === "income").length,
    bothKindCount: items.filter((item) => item.kind === "both").length,
    addMode: first(params.add) === "1",
    editingCategory,
    notice,
  };
}
