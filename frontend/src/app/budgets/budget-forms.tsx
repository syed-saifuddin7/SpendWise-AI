"use client";

import {
  Copy,
  Loader2,
  Minus,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  BudgetCategoryOption,
  BudgetCategoryRow,
} from "@/lib/data/budgets";
import { formatMoney } from "@/lib/finance";

import {
  copyPreviousMonthBudget,
  deleteCategoryBudget,
  saveCategoryBudget,
  saveMonthlyBudget,
} from "./actions";

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl px-3 py-2 text-sm sw-enter"
      style={{
        background: "color-mix(in srgb, var(--danger) 10%, transparent)",
        color: "var(--danger)",
      }}
    >
      {message}
    </p>
  );
}

export function BudgetEditor({
  month,
  currency,
  amount,
  defaultBudget,
}: {
  month: string;
  currency: string;
  amount: number;
  defaultBudget: number;
}) {
  const [state, formAction, pending] = useActionState(
    saveMonthlyBudget,
    undefined,
  );
  const [value, setValue] = useState(amount > 0 ? String(amount) : "");
  const parsed = Number(value);
  const canSave = Number.isFinite(parsed) && parsed > 0;

  function bump(delta: number) {
    const current = Number(value) || 0;
    const next = Math.max(0, current + delta);
    setValue(next > 0 ? String(next) : "");
  }

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="month" value={month} />

      <label htmlFor="monthly-budget" className="text-sm font-medium">
        Monthly budget
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex flex-1 items-center gap-1 rounded-xl border p-1"
          style={{ borderColor: "var(--line)", background: "var(--bg)" }}
        >
          <button
            type="button"
            onClick={() => bump(-500)}
            aria-label="Decrease budget by 500"
            className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Minus size={15} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <span className="text-sm font-semibold sw-muted">
              {currency}
            </span>
            <input
              id="monthly-budget"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={defaultBudget > 0 ? String(defaultBudget) : "0"}
              className="w-full bg-transparent py-2 text-base font-semibold outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => bump(500)}
            aria-label="Increase budget by 500"
            className="grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Plus size={15} />
          </button>
        </div>

        <button
          type="submit"
          disabled={pending || !canSave}
          className="sw-glow flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--brand)" }}
        >
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {pending ? "Saving..." : "Save budget"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[1000, 2500, 5000].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => bump(step)}
            className="rounded-full border px-3 py-1 font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
            style={{ borderColor: "var(--line)" }}
          >
            +{formatMoney(step, currency)}
          </button>
        ))}

        {defaultBudget > 0 && amount !== defaultBudget && (
          <button
            type="button"
            onClick={() => setValue(String(defaultBudget))}
            className="flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition hover:opacity-80"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            <Wand2 size={13} />
            Use default {formatMoney(defaultBudget, currency)}
          </button>
        )}
      </div>

      {state?.error && <ErrorNote message={state.error} />}
    </form>
  );
}

export function CategoryBudgetForm({
  month,
  currency,
  categories,
  rows,
  initialCategory,
}: {
  month: string;
  currency: string;
  categories: BudgetCategoryOption[];
  rows: BudgetCategoryRow[];
  initialCategory: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveCategoryBudget,
    undefined,
  );

  const startingCategory =
    initialCategory ??
    categories.find((option) => option.name === "Food")?.name ??
    categories[0]?.name ??
    "";

  const [category, setCategory] = useState(startingCategory);
  const [value, setValue] = useState(() => {
    const existing = rows.find((row) => row.name === startingCategory);
    return existing ? String(existing.budget) : "";
  });

  const parsed = Number(value);
  const canSave = Boolean(category) && Number.isFinite(parsed) && parsed > 0;
  const existing = rows.find((row) => row.name === category);

  function changeCategory(next: string) {
    setCategory(next);
    const match = rows.find((row) => row.name === next);
    setValue(match ? String(match.budget) : "");
  }

  return (
    <form action={formAction} className="space-y-4" id="category-budget-form">
      <input type="hidden" name="month" value={month} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category-budget-category"
            className="text-sm font-medium"
          >
            Category
          </label>
          <select
            id="category-budget-category"
            name="category"
            value={category}
            onChange={(event) => changeCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
            style={{ borderColor: "var(--line)" }}
          >
            {!category && <option value="">Choose a category</option>}
            {categories.map((option) => (
              <option key={option.name} value={option.name}>
                {option.emoji} {option.name}
                {rows.some((row) => row.name === option.name)
                  ? " · budgeted"
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="category-budget-amount"
            className="text-sm font-medium"
          >
            Budget ({currency})
          </label>
          <input
            id="category-budget-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
            className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
      </div>

      {existing && (
        <p className="text-xs sw-muted">
          {existing.emoji} {existing.name} already has{" "}
          {formatMoney(existing.budget, currency)} budgeted
          {existing.spent > 0
            ? ` and ${formatMoney(existing.spent, currency)} spent this month`
            : ""}
          . Saving will update it.
        </p>
      )}

      {state?.error && <ErrorNote message={state.error} />}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending || !canSave}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--brand)" }}
        >
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {pending
            ? "Saving..."
            : existing
              ? "Update category budget"
              : "Add category budget"}
        </button>
      </div>
    </form>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Remove category budget"
      title="Remove category budget"
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      style={{ color: "var(--danger)" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

export function DeleteCategoryBudgetForm({
  month,
  category,
}: {
  month: string;
  category: string;
}) {
  return (
    <form
      action={deleteCategoryBudget}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove the ${category} budget for this month? Your expenses will stay untouched.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="category" value={category} />
      <DeleteSubmit />
    </form>
  );
}

function CopySubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
      style={{ borderColor: "var(--line)" }}
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Copy size={14} />
      )}
      {pending ? "Copying..." : "Copy last month"}
    </button>
  );
}

export function CopyBudgetButton({ month }: { month: string }) {
  return (
    <form action={copyPreviousMonthBudget}>
      <input type="hidden" name="month" value={month} />
      <CopySubmit />
    </form>
  );
}
