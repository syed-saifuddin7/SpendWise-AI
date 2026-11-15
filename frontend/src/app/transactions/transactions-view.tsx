"use client";

import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useState, useTransition } from "react";

import { Metric, Section } from "@/components/spendwise/ui";
import { categoryEmoji } from "@/lib/categories";
import type {
  LedgerTransaction,
  TransactionsData,
} from "@/lib/data/transactions";
import { formatExpenseDate, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";
import type { TransactionType } from "@/lib/types";
import { walletMeta } from "@/lib/wallets";

import { deleteTransaction } from "./actions";

const TYPE_TABS: { label: string; value: TransactionType | null }[] = [
  { label: "All", value: null },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Transfers", value: "transfer" },
];

function buildUrl(
  data: TransactionsData,
  overrides: Record<string, string | null> = {},
) {
  const params = new URLSearchParams({ month: data.monthKey });

  if (data.query) params.set("q", data.query);
  if (data.categoryFilter) params.set("category", data.categoryFilter);
  if (data.typeFilter) params.set("type", data.typeFilter);
  if (data.walletFilter) params.set("wallet", String(data.walletFilter));

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  return `/transactions?${params.toString()}`;
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete transaction"
      title="Delete transaction"
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 hover:text-[var(--danger)] disabled:opacity-50 dark:hover:bg-white/10"
    >
      <Trash2 size={15} />
    </button>
  );
}

function TransactionIcon({ transaction }: { transaction: LedgerTransaction }) {
  if (transaction.type === "transfer") {
    return (
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--ai) 12%, transparent)",
          color: "var(--ai)",
        }}
      >
        <ArrowLeftRight size={18} />
      </span>
    );
  }

  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
      style={{ background: "var(--bg)" }}
    >
      {categoryEmoji(transaction.category)}
    </span>
  );
}

function transactionSubtitle(transaction: LedgerTransaction) {
  const details: string[] = [];

  if (transaction.type === "transfer") {
    details.push(
      `${transaction.walletName ?? "No wallet"} → ${
        transaction.transferWalletName ?? "No wallet"
      }`,
    );
  } else {
    details.push(transaction.category || "Other");
    if (transaction.walletName) {
      details.push(
        transaction.type === "income"
          ? `into ${transaction.walletName}`
          : transaction.walletName,
      );
    }
  }

  details.push(formatExpenseDate(transaction.date));

  if (transaction.description) {
    details.push(transaction.description);
  }

  return details.join(" · ");
}

function TransactionAmount({
  transaction,
  currency,
}: {
  transaction: LedgerTransaction;
  currency: string;
}) {
  const amount = formatMoney(Number(transaction.amount) || 0, currency);

  if (transaction.type === "income") {
    return (
      <div className="text-right font-bold" style={{ color: "var(--brand)" }}>
        +{amount}
      </div>
    );
  }

  if (transaction.type === "transfer") {
    return (
      <div className="text-right">
        <div className="font-bold sw-muted">{amount}</div>
        <div className="text-[10px] uppercase tracking-wide sw-muted">
          moved
        </div>
      </div>
    );
  }

  return <div className="text-right font-bold">−{amount}</div>;
}

export function TransactionsView({ data }: { data: TransactionsData }) {
  const router = useRouter();
  const [query, setQuery] = useState(data.query);
  const [searching, startSearching] = useTransition();

  const filtered = Boolean(
    data.query || data.categoryFilter || data.typeFilter || data.walletFilter,
  );
  const baseUrl = buildUrl(data, {
    q: null,
    category: null,
    type: null,
    wallet: null,
  });
  const addHref = buildUrl(data, { add: "1", edit: null });

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();
    startSearching(() => {
      router.replace(buildUrl(data, { q: value || null, add: null, edit: null }), {
        scroll: false,
      });
    });
  }

  function changeCategory(value: string) {
    router.replace(
      buildUrl(data, { category: value || null, add: null, edit: null }),
      { scroll: false },
    );
  }

  function changeWallet(value: string) {
    router.replace(
      buildUrl(data, { wallet: value || null, add: null, edit: null }),
      { scroll: false },
    );
  }

  const cleanOverrides = {
    add: null,
    edit: null,
    saved: null,
    deleted: null,
    error: null,
  };
  const prevHref = buildUrl(data, {
    ...cleanOverrides,
    month: data.previousMonth,
  });
  const nextHref = buildUrl(data, { ...cleanOverrides, month: data.nextMonth });

  const walletFilterName =
    data.wallets.find((wallet) => wallet.id === data.walletFilter)?.name ?? null;

  return (
    <div>
      {data.notice && (
        <div
          className="sw-enter mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{
            background: `color-mix(in srgb, var(--${
              data.notice.type === "error" ? "danger" : "brand"
            }) 10%, transparent)`,
            color: `var(--${data.notice.type === "error" ? "danger" : "brand"})`,
          }}
        >
          {data.notice.message}
          <Link
            href={buildUrl(data, { saved: null, deleted: null, error: null })}
            scroll={false}
            aria-label="Dismiss"
            className="ml-auto"
          >
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Income this month"
          value={formatMoney(data.monthIncome, data.currency)}
          note={`${data.monthCounts.income} income entr${
            data.monthCounts.income === 1 ? "y" : "ies"
          }`}
          icon={<ArrowDownRight size={17} />}
        />
        <Metric
          label="Spent this month"
          value={formatMoney(data.monthSpending, data.currency)}
          note={`${data.monthCounts.expense} expense${
            data.monthCounts.expense === 1 ? "" : "s"
          }`}
          good={false}
          icon={<ArrowUpRight size={17} />}
        />
        <Metric
          label="Net cash flow"
          value={formatMoney(data.monthNet, data.currency)}
          note="income minus spending"
          good={data.monthNet >= 0}
          icon={<ArrowLeftRight size={17} />}
        />
        <Metric
          label="Top category"
          value={data.topCategory?.name ?? "—"}
          note={
            data.topCategory
              ? formatMoney(data.topCategory.amount, data.currency)
              : "No expenses yet"
          }
        />
      </div>

      <div className="mt-4">
        <Section
          title="Ledger"
          action={<span className="text-xs sw-muted">{data.monthLabel}</span>}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div
                className="flex items-center justify-between gap-1 rounded-xl p-1 sm:justify-start"
                style={{ background: "var(--bg)" }}
              >
                <Link
                  href={prevHref}
                  scroll={false}
                  aria-label={`Previous month (${monthLabel(data.previousMonth)})`}
                  className="grid size-9 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ChevronLeft size={17} />
                </Link>
                <span className="min-w-36 text-center text-sm font-semibold">
                  {data.monthLabel}
                </span>
                {data.nextDisabled ? (
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-lg opacity-30"
                  >
                    <ChevronRight size={17} />
                  </span>
                ) : (
                  <Link
                    href={nextHref}
                    scroll={false}
                    aria-label={`Next month (${monthLabel(data.nextMonth)})`}
                    className="grid size-9 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <ChevronRight size={17} />
                  </Link>
                )}
              </div>

              <form onSubmit={applySearch} className="flex flex-1 gap-2">
                <div
                  className="flex flex-1 items-center gap-2 rounded-xl border px-3"
                  style={{ borderColor: "var(--line)" }}
                >
                  <Search size={16} className="sw-muted shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search names, categories, wallets..."
                    aria-label="Search transactions"
                    className="w-full bg-transparent py-2.5 text-sm outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        startSearching(() => {
                          router.replace(
                            buildUrl(data, {
                              q: null,
                              add: null,
                              edit: null,
                            }),
                            { scroll: false },
                          );
                        });
                      }}
                      className="sw-muted"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded-xl border px-4 text-sm font-semibold disabled:opacity-60"
                  style={{ borderColor: "var(--line)" }}
                >
                  Search
                </button>
              </form>

              <Link
                href={addHref}
                scroll={false}
                className="sw-glow sw-shine flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Add transaction
              </Link>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className="flex flex-wrap gap-1 rounded-xl p-1"
                style={{ background: "var(--bg)" }}
              >
                {TYPE_TABS.map((tab) => {
                  const selected = data.typeFilter === tab.value;

                  return (
                    <Link
                      key={tab.label}
                      href={buildUrl(data, {
                        type: tab.value,
                        category: null,
                        add: null,
                        edit: null,
                      })}
                      scroll={false}
                      className="rounded-lg px-3 py-2 text-xs font-semibold transition"
                      style={
                        selected
                          ? { background: "var(--panel)", color: "var(--brand)" }
                          : { color: "var(--muted)" }
                      }
                    >
                      {tab.label}
                      <span className="ml-1.5 opacity-70">
                        {tab.value
                          ? data.monthCounts[tab.value]
                          : data.monthCount}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                <select
                  value={data.categoryFilter ?? ""}
                  onChange={(event) => changeCategory(event.target.value)}
                  aria-label="Filter by category"
                  disabled={data.typeFilter === "transfer"}
                  className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm disabled:opacity-50 sm:w-auto"
                  style={{ borderColor: "var(--line)" }}
                >
                  <option value="">All categories</option>
                  {data.filterCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={data.walletFilter ? String(data.walletFilter) : ""}
                  onChange={(event) => changeWallet(event.target.value)}
                  aria-label="Filter by wallet"
                  className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm sm:w-auto"
                  style={{ borderColor: "var(--line)" }}
                >
                  <option value="">All wallets</option>
                  {data.wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {walletMeta(wallet.type).emoji} {wallet.name}
                      {wallet.isActive ? "" : " (archived)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filtered && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sw-muted">
              <span>
                {data.count} of {data.monthCount} transactions shown
                {walletFilterName ? ` · ${walletFilterName}` : ""}
              </span>
              <Link
                href={baseUrl}
                scroll={false}
                className="font-semibold"
                style={{ color: "var(--brand)" }}
              >
                Clear filters
              </Link>
            </div>
          )}

          {filtered && data.count > 0 && (
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: "var(--bg)" }}
              >
                <span className="sw-muted">Matching income</span>{" "}
                <b style={{ color: "var(--brand)" }}>
                  {formatMoney(data.totalIncome, data.currency)}
                </b>
              </div>
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: "var(--bg)" }}
              >
                <span className="sw-muted">Matching spending</span>{" "}
                <b>{formatMoney(data.totalSpent, data.currency)}</b>
              </div>
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: "var(--bg)" }}
              >
                <span className="sw-muted">Matching net</span>{" "}
                <b style={{ color: data.netFlow < 0 ? "var(--danger)" : undefined }}>
                  {formatMoney(data.netFlow, data.currency)}
                </b>
              </div>
            </div>
          )}

          <div className="mt-4">
            {data.transactions.length ? (
              <div
                className="sw-stagger divide-y"
                style={{ borderColor: "var(--line)" }}
              >
                {data.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg py-3.5 transition hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                  >
                    <TransactionIcon transaction={transaction} />

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {transaction.name}
                      </div>
                      <div className="truncate text-xs sw-muted">
                        {transactionSubtitle(transaction)}
                      </div>
                    </div>

                    <TransactionAmount
                      transaction={transaction}
                      currency={data.currency}
                    />

                    <div className="flex items-center gap-1">
                      <Link
                        href={buildUrl(data, {
                          edit: String(transaction.id),
                          add: null,
                        })}
                        scroll={false}
                        aria-label={`Edit ${transaction.name}`}
                        title="Edit transaction"
                        className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Pencil size={15} />
                      </Link>

                      <form
                        action={deleteTransaction}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Delete "${transaction.name}"? This cannot be undone.`,
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={String(transaction.id)}
                        />
                        <input
                          type="hidden"
                          name="month"
                          value={data.monthKey}
                        />
                        <DeleteButton />
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : data.monthCount ? (
              <div className="py-10 text-center">
                <ReceiptText className="mx-auto sw-muted" size={28} />
                <p className="mt-3 font-semibold">
                  No transactions match your filters
                </p>
                <p className="mt-1 text-sm sw-muted">
                  Try a different search term, type, category or wallet.
                </p>
                <Link
                  href={baseUrl}
                  scroll={false}
                  className="mt-4 inline-block rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: "var(--line)" }}
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="py-10 text-center">
                <ReceiptText className="mx-auto sw-muted" size={28} />
                <p className="mt-3 font-semibold">
                  No transactions in {data.monthLabel}
                </p>
                <p className="mt-1 text-sm sw-muted">
                  Add an expense, income entry or transfer to get this month
                  moving.
                </p>
                <Link
                  href={addHref}
                  scroll={false}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Plus size={16} />
                  Add transaction
                </Link>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
