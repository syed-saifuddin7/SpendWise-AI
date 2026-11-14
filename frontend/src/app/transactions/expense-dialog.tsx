"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { TransactionCategory } from "@/lib/data/transactions";
import { todayKey } from "@/lib/dates";
import type { ExpenseRecord } from "@/lib/types";

import { saveExpense } from "./actions";

type ExpenseDialogProps = {
  categories: TransactionCategory[];
  currency: string;
  closeHref: string;
  expense: ExpenseRecord | null;
};

export function ExpenseDialog({
  categories,
  currency,
  closeHref,
  expense,
}: ExpenseDialogProps) {
  const [state, formAction, pending] = useActionState(saveExpense, undefined);

  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(
    expense ? String(Number(expense.amount)) : "",
  );
  const [date, setDate] = useState(expense?.date?.slice(0, 10) ?? todayKey());
  const [category, setCategory] = useState(
    expense?.category ??
      categories.find((option) => option.name === "Food")?.name ??
      categories[0]?.name ??
      "",
  );
  const [description, setDescription] = useState(expense?.description ?? "");

  const categoryOptions =
    category && !categories.some((option) => option.name === category)
      ? [{ id: null, name: category, emoji: null }, ...categories]
      : categories;

  const isEditing = Boolean(expense);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close dialog"
        className="absolute inset-0"
      />

      <div className="sw-card sw-pop relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit expense" : "Add expense"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Update the details of this expense."
                : "Record a new expense for your budget."}
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

        <form action={formAction} className="space-y-4">
          {expense && <input type="hidden" name="id" value={expense.id} />}

          <div>
            <label htmlFor="expense-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="expense-name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Grocery run"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="expense-amount" className="text-sm font-medium">
                Amount ({currency})
              </label>
              <input
                id="expense-amount"
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
              <label htmlFor="expense-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="expense-date"
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

          <div>
            <label htmlFor="expense-category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="expense-category"
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            >
              {!category && <option value="">Choose a category</option>}
              {categoryOptions.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="expense-description"
              className="text-sm font-medium"
            >
              Description <span className="sw-muted">(optional)</span>
            </label>
            <textarea
              id="expense-description"
              name="description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything worth remembering about this expense"
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
              disabled={pending}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: "var(--brand)" }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
