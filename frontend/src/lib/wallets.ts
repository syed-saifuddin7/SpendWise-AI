import type { TransactionRecord, WalletRecord, WalletType } from "@/lib/types";

export const WALLET_META: Record<
  WalletType,
  { label: string; emoji: string; blurb: string }
> = {
  bank: {
    label: "Bank",
    emoji: "🏦",
    blurb: "Savings and current accounts",
  },
  cash: {
    label: "Cash",
    emoji: "💵",
    blurb: "Notes and coins in hand",
  },
  credit: {
    label: "Credit card",
    emoji: "💳",
    blurb: "Money you can spend now and pay later",
  },
  wallet: {
    label: "Digital wallet",
    emoji: "📱",
    blurb: "UPI, PayPal, and similar balances",
  },
  investment: {
    label: "Investment",
    emoji: "📈",
    blurb: "Stocks, funds, and long-term savings",
  },
};

export function walletMeta(type: WalletType | string) {
  return WALLET_META[type as WalletType] ?? WALLET_META.bank;
}

export type WalletMovement = {
  balance: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  transactionCount: number;
};

export type WalletMovementTransaction = Pick<
  TransactionRecord,
  "type" | "amount" | "date" | "wallet_id" | "transfer_wallet_id"
>;

/**
 * A wallet balance is its opening balance plus every movement it has seen:
 * income in, expenses out, and both sides of transfers. Monthly inflow and
 * outflow only count rows inside the supplied range.
 */
export function summarizeWallet(
  wallet: Pick<WalletRecord, "id" | "opening_balance">,
  transactions: WalletMovementTransaction[],
  monthStart: string,
  nextMonthStart: string,
): WalletMovement {
  let balance = Number(wallet.opening_balance) || 0;
  let monthlyInflow = 0;
  let monthlyOutflow = 0;
  let transactionCount = 0;

  const inMonth = (date: string) => date >= monthStart && date < nextMonthStart;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;
    const isSource = transaction.wallet_id === wallet.id;
    const isDestination = transaction.transfer_wallet_id === wallet.id;

    if (transaction.type === "transfer") {
      if (!isSource && !isDestination) continue;

      transactionCount += 1;

      if (isSource) {
        balance -= amount;

        if (inMonth(transaction.date)) {
          monthlyOutflow += amount;
        }
      }

      if (isDestination) {
        balance += amount;

        if (inMonth(transaction.date)) {
          monthlyInflow += amount;
        }
      }

      continue;
    }

    if (!isSource) continue;

    transactionCount += 1;

    if (transaction.type === "income") {
      balance += amount;

      if (inMonth(transaction.date)) {
        monthlyInflow += amount;
      }
    } else {
      balance -= amount;

      if (inMonth(transaction.date)) {
        monthlyOutflow += amount;
      }
    }
  }

  return { balance, monthlyInflow, monthlyOutflow, transactionCount };
}
