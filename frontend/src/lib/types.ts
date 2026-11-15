export type TransactionType = "income" | "expense" | "transfer";

export type WalletType = "bank" | "cash" | "credit" | "wallet" | "investment";

export type TransactionRecord = {
  id: number;
  user_id: string;
  type: TransactionType;
  name: string;
  amount: number | string;
  category: string;
  category_id?: number | null;
  description?: string | null;
  date: string;
  wallet_id: number | null;
  transfer_wallet_id: number | null;
  recurring_expense_id?: number | null;
  legacy_expense_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type WalletRecord = {
  id: number;
  user_id: string;
  name: string;
  type: WalletType;
  currency: string;
  opening_balance: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export const TRANSACTION_TYPES: TransactionType[] = [
  "expense",
  "income",
  "transfer",
];

export const WALLET_TYPES: WalletType[] = [
  "bank",
  "cash",
  "credit",
  "wallet",
  "investment",
];

export function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

export function isWalletType(value: string): value is WalletType {
  return WALLET_TYPES.includes(value as WalletType);
}
