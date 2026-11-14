"use client";

import {
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
import type { TransactionsData } from "@/lib/data/transactions";
import { formatExpenseDate, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/finance";

import { deleteExpense } from "./actions";

function buildUrl(
  data: TransactionsData,
  overrides: Record<string, string | null> = {},
) {
  const params = new URLSearchParams({ month: data.monthKey });

  if (data.categoryFilter) params.set("category", data.categoryFilter);
  if (data.query) params.set("q", data.query);

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
      aria-label="Delete expense"
      title="Delete expense"
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      style={{ color: "var(--danger)" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

export function TransactionsView({ data }: { data: TransactionsData }) {
  const router = useRouter();
  const [query, setQuery] = useState(data.query);
  const [searching, startSearching] = useTransition();

  const filtered = Boolean(data.query || data.categoryFilter);
  const baseUrl = buildUrl(data);
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

  const prevHref = buildUrl(data, {
    month: data.previousMonth,
    add: null,
    edit: null,
    saved: null,
    deleted: null,
    error: null,
  });
  const nextHref = buildUrl(data, {
    month: data.nextMonth,
    add: null,
    edit: null,
    saved: null,
    deleted: null,
    error: null,
  });

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
            href={baseUrl}
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
          label="Spent this month"
          value={formatMoney(data.monthTotal, data.currency)}
          note={`${data.monthCount} expense${data.monthCount === 1 ? "" : "s"}`}
        />
        <Metric
          label="Matching expenses"
          value={formatMoney(data.totalSpent, data.currency)}
          note={`${data.count} of ${data.monthCount} shown`}
        />
        <Metric
          label="Daily average"
          value={formatMoney(data.dailyAverage, data.currency)}
          note={data.isCurrentMonth ? "so far this month" : "across the month"}
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
          title="Expenses"
          action={
            <span className="text-xs sw-muted">{data.monthLabel}</span>
          }
        >
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
                  placeholder="Search this month's expenses..."
                  aria-label="Search expenses"
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

            <div className="flex gap-2">
              <select
                value={data.categoryFilter ?? ""}
                onChange={(event) => changeCategory(event.target.value)}
                aria-label="Filter by category"
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm sm:w-auto"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">All categories</option>
                {data.filterCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <Link
                href={addHref}
                scroll={false}
                className="sw-glow sw-shine flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Add expense
              </Link>
            </div>
          </div>

          {filtered && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sw-muted">
              <span>
                {data.count} of {data.monthCount} expenses shown
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

          <div className="mt-4">
            {data.expenses.length ? (
              <div
                className="sw-stagger divide-y"
                style={{ borderColor: "var(--line)" }}
              >
                {data.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg py-3.5 transition hover:bg-black/[0.025] dark:hover:bg-white/[0.03]"
                  >
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
                      style={{ background: "var(--bg)" }}
                    >
                      {categoryEmoji(expense.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">
                        {expense.name}
                      </div>
                      <div className="truncate text-xs sw-muted">
                        {expense.category || "Other"} ·{" "}
                        {formatExpenseDate(expense.date)}
                        {expense.description
                          ? ` · ${expense.description}`
                          : ""}
                      </div>
                    </div>

                    <div className="font-bold">
                      {formatMoney(Number(expense.amount) || 0, data.currency)}
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={buildUrl(data, {
                          edit: String(expense.id),
                          add: null,
                        })}
                        scroll={false}
                        aria-label={`Edit ${expense.name}`}
                        title="Edit expense"
                        className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <Pencil size={15} />
                      </Link>

                      <form
                        action={deleteExpense}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Delete "${expense.name}"? This cannot be undone.`,
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={String(expense.id)}
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
            ) : data.monthExpenses.length ? (
              <div className="py-10 text-center">
                <ReceiptText className="mx-auto sw-muted" size={28} />
                <p className="mt-3 font-semibold">
                  No expenses match your filters
                </p>
                <p className="mt-1 text-sm sw-muted">
                  Try a different search term or category.
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
                  No expenses in {data.monthLabel}
                </p>
                <p className="mt-1 text-sm sw-muted">
                  Add your first expense for this month to start tracking.
                </p>
                <Link
                  href={addHref}
                  scroll={false}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Plus size={16} />
                  Add expense
                </Link>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
