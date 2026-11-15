import "server-only";

import { redirect } from "next/navigation";

import {
  currentMonthKey,
  monthLabel,
  monthRange,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { WalletRecord, WalletType } from "@/lib/types";
import { summarizeWallet, type WalletMovementTransaction } from "@/lib/wallets";

export type WalletRow = {
  id: number;
  name: string;
  type: WalletType;
  currency: string;
  openingBalance: number;
  balance: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  isActive: boolean;
  transactionCount: number;
};

export type WalletsNotice = {
  type: "success" | "error";
  message: string;
};

export type WalletsData = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  currency: string;
  monthKey: string;
  monthLabel: string;
  wallets: WalletRow[];
  activeCount: number;
  archivedCount: number;
  totalBalance: number;
  liquidBalance: number;
  investedBalance: number;
  creditBalance: number;
  monthlyIncome: number;
  monthlySpending: number;
  monthlyNet: number;
  transactionCount: number;
  addMode: boolean;
  editingWallet: WalletRow | null;
  notice: WalletsNotice | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getWalletsData(
  params: SearchParams,
): Promise<WalletsData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fwallets");
  }

  const monthKey = currentMonthKey();
  const { start, nextStart } = monthRange(monthKey);

  const [settingsResult, walletsResult, transactionsResult] = await Promise.all([
    supabase
      .from("user_settings")
      .select("display_name, currency")
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .order("id", { ascending: true }),
    supabase
      .from("transactions")
      .select("type, amount, date, wallet_id, transfer_wallet_id")
      .eq("user_id", user.id),
  ]);

  if (settingsResult.error) {
    throw new Error(`Could not load settings: ${settingsResult.error.message}`);
  }

  if (walletsResult.error) {
    throw new Error(`Could not load wallets: ${walletsResult.error.message}`);
  }

  if (transactionsResult.error) {
    throw new Error(
      `Could not load wallet activity: ${transactionsResult.error.message}`,
    );
  }

  const settings = settingsResult.data?.[0];
  const currency = (settings?.currency as string | null) ?? "INR";
  const walletRecords = (walletsResult.data ?? []) as WalletRecord[];
  const transactions = (transactionsResult.data ??
    []) as WalletMovementTransaction[];

  const wallets: WalletRow[] = walletRecords
    .map((wallet) => {
      const movement = summarizeWallet(wallet, transactions, start, nextStart);

      return {
        id: Number(wallet.id),
        name: String(wallet.name),
        type: wallet.type,
        currency: String(wallet.currency ?? currency),
        openingBalance: Number(wallet.opening_balance) || 0,
        balance: movement.balance,
        monthlyInflow: movement.monthlyInflow,
        monthlyOutflow: movement.monthlyOutflow,
        isActive: Boolean(wallet.is_active),
        transactionCount: movement.transactionCount,
      };
    })
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        b.balance - a.balance ||
        a.name.localeCompare(b.name),
    );

  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  const totalBalance = activeWallets.reduce(
    (total, wallet) => total + wallet.balance,
    0,
  );
  const liquidBalance = activeWallets
    .filter((wallet) => ["bank", "cash", "wallet"].includes(wallet.type))
    .reduce((total, wallet) => total + wallet.balance, 0);
  const investedBalance = activeWallets
    .filter((wallet) => wallet.type === "investment")
    .reduce((total, wallet) => total + wallet.balance, 0);
  const creditBalance = activeWallets
    .filter((wallet) => wallet.type === "credit")
    .reduce((total, wallet) => total + wallet.balance, 0);

  const monthTransactions = transactions.filter(
    (transaction) => transaction.date >= start && transaction.date < nextStart,
  );
  const monthlyIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);
  const monthlySpending = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + (Number(transaction.amount) || 0), 0);

  const editingId = first(params.edit);
  const editingWallet =
    editingId && /^\d+$/.test(editingId)
      ? (wallets.find((wallet) => String(wallet.id) === editingId) ?? null)
      : null;

  const errorMessage = first(params.error);
  const saved = first(params.saved);
  const archived = first(params.archived);
  const restored = first(params.restored);
  const deleted = first(params.deleted);

  const notice: WalletsNotice | null = errorMessage
    ? { type: "error", message: errorMessage.slice(0, 200) }
    : saved === "added"
      ? { type: "success", message: "Wallet added." }
      : saved === "updated"
        ? { type: "success", message: "Wallet updated." }
        : archived === "1"
          ? {
              type: "success",
              message:
                "Wallet archived. Its transactions stay in your history and it no longer counts toward balances.",
            }
          : restored === "1"
            ? { type: "success", message: "Wallet restored." }
            : deleted === "1"
              ? { type: "success", message: "Wallet deleted." }
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
    wallets,
    activeCount: activeWallets.length,
    archivedCount: wallets.length - activeWallets.length,
    totalBalance,
    liquidBalance,
    investedBalance,
    creditBalance,
    monthlyIncome,
    monthlySpending,
    monthlyNet: monthlyIncome - monthlySpending,
    transactionCount: transactions.length,
    addMode: first(params.add) === "1",
    editingWallet,
    notice,
  };
}
