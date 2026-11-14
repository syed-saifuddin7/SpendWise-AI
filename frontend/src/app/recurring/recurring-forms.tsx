"use client";

import { CalendarClock, Loader2, Pause, Play, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type {
  RecurringCategoryOption,
  RecurringItem,
} from "@/lib/data/recurring";
import { formatExpenseDate, isValidDateKey, todayKey } from "@/lib/dates";
import {
  RECURRING_FREQUENCIES,
  frequencyLabel,
  nextOccurrence,
} from "@/lib/recurring";

import {
  deleteRecurring,
  processDueRecurring,
  saveRecurring,
  toggleRecurring,
} from "./actions";

export function RecurringDialog({
  item,
  categoryOptions,
  closeHref,
}: {
  item: RecurringItem | null;
  categoryOptions: RecurringCategoryOption[];
  closeHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveRecurring,
    undefined,
  );
  const [name, setName] = useState(item?.name ?? "");
  const [frequency, setFrequency] = useState(item?.frequency ?? "monthly");
  const [startDate, setStartDate] = useState(item?.startDate ?? todayKey());

  const isEditing = Boolean(item);
  const previewDate =
    isValidDateKey(startDate) ? nextOccurrence(startDate, frequency) : null;

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
              {isEditing ? "Edit recurring expense" : "Add recurring expense"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Saving recalculates the next run from the start date."
                : "Set it once and SpendWise can generate it every cycle."}
            </p>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={18} />
          </Link>
        </div>

        <form action={formAction} className="space-y-4">
          {item?.id != null && <input type="hidden" name="id" value={item.id} />}

          <div>
            <label htmlFor="recurring-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="recurring-name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Rent, Internet, Gym"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="recurring-amount" className="text-sm font-medium">
                Amount
              </label>
              <input
                id="recurring-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                defaultValue={item?.amount ?? ""}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label
                htmlFor="recurring-category"
                className="text-sm font-medium"
              >
                Category
              </label>
              <select
                id="recurring-category"
                name="category"
                required
                defaultValue={item?.category ?? "Bills"}
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              >
                {categoryOptions.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="recurring-frequency"
                className="text-sm font-medium"
              >
                Frequency
              </label>
              <select
                id="recurring-frequency"
                name="frequency"
                value={frequency}
                onChange={(event) =>
                  setFrequency(event.target.value as typeof frequency)
                }
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              >
                {RECURRING_FREQUENCIES.map((option) => (
                  <option key={option} value={option}>
                    {frequencyLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="recurring-start"
                className="text-sm font-medium"
              >
                Start date
              </label>
              <input
                id="recurring-start"
                name="start_date"
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="recurring-description"
              className="text-sm font-medium"
            >
              Description <span className="sw-muted">(optional)</span>
            </label>
            <textarea
              id="recurring-description"
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={item?.description ?? ""}
              placeholder="Optional note about this recurring expense..."
              className="mt-2 w-full resize-none rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div
            className="flex items-start gap-2 rounded-xl p-3 text-xs sw-muted"
            style={{ background: "var(--bg)" }}
          >
            <CalendarClock
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--brand)" }}
            />
            <p>
              {previewDate
                ? `First expense will be generated on ${formatExpenseDate(
                    previewDate,
                  )}, one full ${frequencyLabel(frequency).toLowerCase()} cycle after the start date.`
                : "Choose a start date to preview the first generated expense."}
            </p>
          </div>

          {state?.error && (
            <p
              className="rounded-xl px-3 py-2 text-sm sw-enter"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
              }}
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
              disabled={pending || !name.trim()}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ background: "var(--brand)" }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add recurring"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete recurring expense"
      title="Delete recurring expense"
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      style={{ color: "var(--danger)" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

export function RecurringDeleteForm({ item }: { item: RecurringItem }) {
  return (
    <form
      action={deleteRecurring}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete "${item.name}"? Expenses it already generated stay in your history.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={item.id} />
      <DeleteSubmit />
    </form>
  );
}

function ToggleSubmit({ active }: { active: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={active ? "Pause recurring expense" : "Resume recurring expense"}
      title={active ? "Pause" : "Resume"}
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      style={{ color: active ? "var(--warn)" : "var(--brand)" }}
    >
      {pending ? (
        <Loader2 size={15} className="animate-spin" />
      ) : active ? (
        <Pause size={15} />
      ) : (
        <Play size={15} />
      )}
    </button>
  );
}

export function RecurringToggleForm({ item }: { item: RecurringItem }) {
  return (
    <form action={toggleRecurring}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="active" value={item.isActive ? "0" : "1"} />
      <ToggleSubmit active={item.isActive} />
    </form>
  );
}

function ProcessSubmit({ dueCount }: { dueCount: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
      style={{ borderColor: "var(--line)", background: "var(--panel)" }}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <CalendarClock size={16} />
      )}
      {pending ? "Processing..." : `Process due now (${dueCount})`}
    </button>
  );
}

export function ProcessDueForm({ dueCount }: { dueCount: number }) {
  return (
    <form action={processDueRecurring}>
      <ProcessSubmit dueCount={dueCount} />
    </form>
  );
}
