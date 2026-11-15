"use client";

import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type {
  LedgerTransaction,
  TransactionCategory,
  TransactionWallet,
} from "@/lib/data/transactions";
import { todayKey } from "@/lib/dates";
import type { TransactionType } from "@/lib/types";
import { walletMeta } from "@/lib/wallets";

import { saveTransaction } from "./actions";

type TransactionDialogProps = {
  categories: TransactionCategory[];
  wallets: TransactionWallet[];
  currency: string;
  closeHref: string;
  transaction: LedgerTransaction | null;
  initialType: TransactionType;
};

const TYPE_META: Record<
  TransactionType,
  {
    label: string;
    heading: string;
    blurb: string;
    nameLabel: string;
    namePlaceholder: string;
    submit: string;
    icon: React.ReactNode;
  }
> = {
  expense: {
    label: "Expense",
    heading: "Add expense",
    blurb: "Money leaves a wallet.",
    nameLabel: "What did you spend on?",
    namePlaceholder: "e.g. Grocery run",
    submit: "Add expense",
    icon: <ArrowUpRight size={15} />,
  },
  income: {
    label: "Income",
    heading: "Add income",
    blurb: "Money enters a wallet.",
    nameLabel: "Where did the money come from?",
    namePlaceholder: "e.g. November salary",
    submit: "Add income",
    icon: <ArrowDownRight size={15} />,
  },
  transfer: {
    label: "Transfer",
    heading: "Add transfer",
    blurb: "Move money between your wallets.",
    nameLabel: "What is this transfer for?",
    namePlaceholder: "e.g. Move to savings",
    submit: "Add transfer",
    icon: <ArrowLeftRight size={15} />,
  },
};

export function TransactionDialog({
  categories,
  wallets,
  currency,
  closeHref,
  transaction,
  initialType,
}: TransactionDialogProps) {
  const [state, formAction, pending] = useActionState(
    saveTransaction,
    undefined,
  );

  const activeWallets = wallets.filter((wallet) => wallet.isActive);
  const startingType = transaction?.type ?? initialType;

  const expenseDefault =
    categories.find((option) => option.name === "Food" && option.kind !== "income")
      ?.name ??
    categories.find((option) => option.kind !== "income")?.name ??
    "Other";
  const incomeDefault =
    categories.find((option) => option.name === "Salary" && option.kind !== "expense")
      ?.name ??
    categories.find((option) => option.kind !== "expense")?.name ??
    "Other";

  const defaultCategory = (nextType: TransactionType) =>
    nextType === "income" ? incomeDefault : expenseDefault;

  const startingWallet = transaction?.wallet_id
    ? String(transaction.wallet_id)
    : activeWallets[0]
      ? String(activeWallets[0].id)
      : "";
  const startingTransferWallet = transaction?.transfer_wallet_id
    ? String(transaction.transfer_wallet_id)
    : (activeWallets.find((wallet) => String(wallet.id) !== startingWallet)
        ?.id ?? "");

  const [type, setType] = useState<TransactionType>(startingType);
  const [name, setName] = useState(transaction?.name ?? "");
  const [amount, setAmount] = useState(
    transaction ? String(Number(transaction.amount)) : "",
  );
  const [date, setDate] = useState(
    transaction?.date?.slice(0, 10) ?? todayKey(),
  );
  const [category, setCategory] = useState(
    transaction && transaction.type !== "transfer"
      ? transaction.category
      : defaultCategory(startingType),
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [walletId, setWalletId] = useState(String(startingWallet));
  const [transferWalletId, setTransferWalletId] = useState(
    String(startingTransferWallet),
  );

  const meta = TYPE_META[type];
  const isEditing = Boolean(transaction);
  const isTransfer = type === "transfer";
  const canTransfer = wallets.length >= 2;

  const categoryOptions = (() => {
    // Transfers aren't categorised by kind, and the category the user already
    // picked (or the one saved on this row) must never disappear underneath it.
    const fits = (option: TransactionCategory) =>
      type === "transfer" ||
      option.kind === "both" ||
      option.kind === type ||
      option.name === category;

    const options = categories.filter(fits);

    if (category && !options.some((option) => option.name === category)) {
      options.unshift({ id: null, name: category, emoji: null, kind: "both" });
    }

    return options;
  })();

  const destinationOptions = wallets.filter(
    (wallet) => String(wallet.id) !== walletId,
  );

  function changeType(nextType: TransactionType) {
    setType(nextType);

    if (nextType !== "transfer") {
      setCategory(defaultCategory(nextType));
    }
  }

  function changeSourceWallet(value: string) {
    setWalletId(value);

    if (value === transferWalletId) {
      const replacement = wallets.find(
        (wallet) => String(wallet.id) !== value,
      );
      setTransferWalletId(replacement ? String(replacement.id) : "");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close dialog"
        className="absolute inset-0"
      />

      <div className="sw-card sw-pop relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit transaction" : meta.heading}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Update the type, amount or account. Balances follow automatically."
                : meta.blurb}
            </p>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={18} />
          </Link>
        </div>

        <div
          className="mb-4 grid grid-cols-3 gap-1 rounded-xl p-1"
          style={{ background: "var(--bg)" }}
          role="group"
          aria-label="Transaction type"
        >
          {(["expense", "income", "transfer"] as const).map((option) => {
            const selected = type === option;
            const disabled = option === "transfer" && !canTransfer;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                title={
                  disabled
                    ? "Add a second wallet before moving money between wallets."
                    : undefined
                }
                onClick={() => changeType(option)}
                className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  selected
                    ? { background: "var(--brand)", color: "white" }
                    : { color: "var(--muted)" }
                }
              >
                {TYPE_META[option].icon}
                {TYPE_META[option].label}
              </button>
            );
          })}
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          {transaction && <input type="hidden" name="id" value={transaction.id} />}

          <div>
            <label htmlFor="transaction-name" className="text-sm font-medium">
              {meta.nameLabel}
            </label>
            <input
              id="transaction-name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={meta.namePlaceholder}
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-amount" className="text-sm font-medium">
                Amount ({currency})
              </label>
              <input
                id="transaction-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label htmlFor="transaction-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="transaction-date"
                name="date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          </div>

          {isTransfer ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="transaction-wallet" className="text-sm font-medium">
                  From wallet
                </label>
                <select
                  id="transaction-wallet"
                  name="wallet_id"
                  required
                  value={walletId}
                  onChange={(event) => changeSourceWallet(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  {!walletId && <option value="">Choose a wallet</option>}
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {walletMeta(wallet.type).emoji} {wallet.name}
                      {wallet.isActive ? "" : " (archived)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transaction-transfer-wallet"
                  className="text-sm font-medium"
                >
                  To wallet
                </label>
                <select
                  id="transaction-transfer-wallet"
                  name="transfer_wallet_id"
                  required
                  value={transferWalletId}
                  onChange={(event) => setTransferWalletId(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  {!transferWalletId && <option value="">Choose a wallet</option>}
                  {destinationOptions.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {walletMeta(wallet.type).emoji} {wallet.name}
                      {wallet.isActive ? "" : " (archived)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="transaction-category"
                  className="text-sm font-medium"
                >
                  Category
                </label>
                <select
                  id="transaction-category"
                  name="category"
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transaction-wallet"
                  className="text-sm font-medium"
                >
                  {type === "income" ? "Into wallet" : "Paid from"}
                </label>
                <select
                  id="transaction-wallet"
                  name="wallet_id"
                  value={walletId}
                  onChange={(event) => setWalletId(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  <option value="">No wallet linked</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {walletMeta(wallet.type).emoji} {wallet.name}
                      {wallet.isActive ? "" : " (archived)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!wallets.length && (
            <p
              className="rounded-xl px-3 py-2 text-xs"
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            >
              No wallets yet, so this entry will not change a balance.{" "}
              <Link
                href="/wallets?add=1"
                className="font-semibold"
                style={{ color: "var(--brand)" }}
              >
                Add a wallet
              </Link>{" "}
              to track where money moves.
            </p>
          )}

          {isTransfer && !canTransfer && (
            <p
              className="rounded-xl px-3 py-2 text-xs"
              style={{
                background: "color-mix(in srgb, var(--warn) 14%, transparent)",
                color: "var(--text)",
              }}
            >
              Transfers need two wallets. Add another wallet first.
            </p>
          )}

          <div>
            <label
              htmlFor="transaction-description"
              className="text-sm font-medium"
            >
              Description <span className="sw-muted">(optional)</span>
            </label>
            <textarea
              id="transaction-description"
              name="description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything worth remembering about this transaction"
              className="mt-2 w-full resize-none rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          {state?.error && (
            <p
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
              }}
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Link
              href={closeHref}
              scroll={false}
              className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
              style={{ borderColor: "var(--line)" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending || (isTransfer && !canTransfer)}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: "var(--brand)" }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? "Saving..." : isEditing ? "Save changes" : meta.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
