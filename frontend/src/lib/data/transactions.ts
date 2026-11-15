import "server-only";

import { redirect } from "next/navigation";

import {
  DEFAULT_CATEGORY_NAMES,
  INCOME_CATEGORY_NAMES,
  TRANSFER_CATEGORY_NAME,
  defaultCategoryKind,
  isCategoryKind,
  type CategoryKind,
} from "@/lib/categories";
import {
  currentMonthKey,
  monthLabel,
  monthRange,
  normalizeMonthKey,
  shiftMonth,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type {
  TransactionRecord,
  TransactionType,
  WalletRecord,
  WalletType,
} from "@/lib/types";
import { isTransactionType } from "@/lib/types";

export type TransactionCategory = {
  id: number | null;
  name: string;
  emoji: string | null;
  kind: CategoryKind;
};

export type TransactionWallet = {
  id: number;
  name: string;
  type: WalletType;
  currency: string;
  isActive: boolean;
};

export type LedgerTransaction = TransactionRecord & {
  walletName: string | null;
  walletType: WalletType | null;
  transferWalletName: string | null;
  transferWalletType: WalletType | null;
};

export type TypeCounts = Record<TransactionType, number>;

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
  transactions: LedgerTransaction[];
  monthTransactions: LedgerTransaction[];
  monthIncome: number;
  monthSpending: number;
  monthNet: number;
  totalIncome: number;
  totalSpent: number;
  netFlow: number;
  monthCounts: TypeCounts;
  counts: TypeCounts;
  count: number;
  monthCount: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
  categories: TransactionCategory[];
  filterCategories: string[];
  wallets: TransactionWallet[];
  categoryFilter: string | null;
  typeFilter: TransactionType | null;
  walletFilter: number | null;
  query: string;
  addMode: boolean;
  addKind: TransactionType;
  editingTransaction: LedgerTransaction | null;
  notice: { type: "success" | "error"; message: string } | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function emptyCounts(): TypeCounts {
  return { expense: 0, income: 0, transfer: 0 };
}

function sumByType(transactions: LedgerTransaction[], type: TransactionType) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
}

function countByType(transactions: LedgerTransaction[]) {
  const counts = emptyCounts();

  for (const transaction of transactions) {
    counts[transaction.type] += 1;
  }

  return counts;
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
  const rawType = (first(params.type) ?? "").trim();
  const typeFilter = isTransactionType(rawType) ? rawType : null;
  const walletIdValue = (first(params.wallet) ?? "").trim();
  const walletFilter =
    /^\d+$/.test(walletIdValue) && Number(walletIdValue) > 0
      ? Number(walletIdValue)
      : null;

  const { start, nextStart, daysInMonth } = monthRange(monthKey);

  const [settingsResult, categoriesResult, walletsResult, transactionsResult] =
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
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .order("is_active", { ascending: false })
        .order("name"),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lt("date", nextStart)
        .order("date", { ascending: false })
        .order("id", { ascending: false }),
    ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(`Could not load categories: ${categoriesResult.error.message}`);
  }

  if (walletsResult.error) {
    throw new Error(`Could not load wallets: ${walletsResult.error.message}`);
  }

  if (transactionsResult.error) {
    throw new Error(
      `Could not load transactions: ${transactionsResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";

  const userCategories: TransactionCategory[] = (
    categoriesResult.data ?? []
  ).map((category) => ({
    id: Number(category.id),
    name: String(category.name),
    emoji: (category.emoji as string | null) ?? null,
    kind: isCategoryKind(String(category.kind))
      ? (String(category.kind) as CategoryKind)
      : defaultCategoryKind(String(category.name)),
  }));

  const wallets: TransactionWallet[] = ((walletsResult.data ?? []) as WalletRecord[]).map(
    (wallet) => ({
      id: Number(wallet.id),
      name: String(wallet.name),
      type: wallet.type,
      currency: String(wallet.currency ?? currency),
      isActive: Boolean(wallet.is_active),
    }),
  );

  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));

  const monthTransactions: LedgerTransaction[] = (
    (transactionsResult.data ?? []) as TransactionRecord[]
  ).map((transaction) => {
    const wallet = transaction.wallet_id
      ? walletById.get(Number(transaction.wallet_id))
      : undefined;
    const transferWallet = transaction.transfer_wallet_id
      ? walletById.get(Number(transaction.transfer_wallet_id))
      : undefined;

    return {
      ...transaction,
      walletName: wallet?.name ?? null,
      walletType: wallet?.type ?? null,
      transferWalletName: transferWallet?.name ?? null,
      transferWalletType: transferWallet?.type ?? null,
    };
  });

  let transactions = monthTransactions;

  if (typeFilter) {
    transactions = transactions.filter(
      (transaction) => transaction.type === typeFilter,
    );
  }

  if (categoryFilter) {
    transactions = transactions.filter(
      (transaction) => transaction.category === categoryFilter,
    );
  }

  if (walletFilter) {
    transactions = transactions.filter(
      (transaction) =>
        Number(transaction.wallet_id) === walletFilter ||
        Number(transaction.transfer_wallet_id) === walletFilter,
    );
  }

  if (query) {
    const needle = query.toLowerCase();

    transactions = transactions.filter((transaction) =>
      [
        transaction.name,
        transaction.description ?? "",
        transaction.type === "transfer" ? TRANSFER_CATEGORY_NAME : transaction.category,
        transaction.walletName ?? "",
        transaction.transferWalletName ?? "",
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }

  const monthIncome = sumByType(monthTransactions, "income");
  const monthSpending = sumByType(monthTransactions, "expense");
  const totalIncome = sumByType(transactions, "income");
  const totalSpent = sumByType(transactions, "expense");

  const isCurrentMonth = monthKey === currentMonth;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

  const categoryTotals = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (transaction.type !== "expense") continue;

    const name = transaction.category || "Other";
    categoryTotals.set(
      name,
      (categoryTotals.get(name) ?? 0) + (Number(transaction.amount) || 0),
    );
  }

  const topCategory = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)[0] ?? null;

  const filterCategories = [
    ...new Set([
      ...userCategories.map((category) => category.name),
      ...monthTransactions
        .filter((transaction) => transaction.type !== "transfer")
        .map((transaction) => transaction.category)
        .filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const categories: TransactionCategory[] = (() => {
    const options = new Map<string, TransactionCategory>();

    for (const name of [...DEFAULT_CATEGORY_NAMES, ...INCOME_CATEGORY_NAMES]) {
      options.set(name, {
        id: null,
        name,
        emoji: null,
        kind: defaultCategoryKind(name),
      });
    }

    for (const category of userCategories) {
      options.set(category.name, category);
    }

    for (const transaction of monthTransactions) {
      if (
        transaction.type !== "transfer" &&
        transaction.category &&
        !options.has(transaction.category)
      ) {
        options.set(transaction.category, {
          id: null,
          name: transaction.category,
          emoji: null,
          kind: "both",
        });
      }
    }

    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  const editingId = first(params.edit);
  const editingTransaction = editingId
    ? (monthTransactions.find(
        (transaction) => String(transaction.id) === editingId,
      ) ?? null)
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
              ? "Transaction saved."
              : "Transaction deleted.",
          }
        : null;

  const nextMonth = shiftMonth(monthKey, 1);
  const rawKind = (first(params.kind) ?? "").trim();

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
    transactions,
    monthTransactions,
    monthIncome,
    monthSpending,
    monthNet: monthIncome - monthSpending,
    totalIncome,
    totalSpent,
    netFlow: totalIncome - totalSpent,
    monthCounts: countByType(monthTransactions),
    counts: countByType(transactions),
    count: transactions.length,
    monthCount: monthTransactions.length,
    dailyAverage: daysElapsed > 0 ? monthSpending / daysElapsed : 0,
    topCategory,
    categories,
    filterCategories,
    wallets,
    categoryFilter,
    typeFilter,
    walletFilter,
    query,
    addMode: first(params.add) === "1",
    addKind: isTransactionType(rawKind) ? rawKind : "expense",
    editingTransaction,
    notice,
  };
}
