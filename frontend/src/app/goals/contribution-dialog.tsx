"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { ContributionRow, GoalRow } from "@/lib/data/goals";
import { formatMoney } from "@/lib/finance";

import { saveContribution } from "./actions";

type ContributionDialogProps = {
  goal: GoalRow;
  contribution: ContributionRow | null;
  today: string;
  closeHref: string;
};

export function ContributionDialog({
  goal,
  contribution,
  today,
  closeHref,
}: ContributionDialogProps) {
  const [state, formAction, pending] = useActionState(
    saveContribution,
    undefined,
  );

  const [amount, setAmount] = useState(
    contribution ? String(contribution.amount) : "",
  );
  const [date, setDate] = useState(contribution?.date ?? today);
  const [note, setNote] = useState(contribution?.note ?? "");

  const isEditing = Boolean(contribution);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close dialog"
        className="absolute inset-0"
      />

      <div className="sw-card sw-pop relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit contribution" : "Add to goal"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {goal.emoji} {goal.name} · {formatMoney(goal.remaining, goal.currency)}{" "}
              to go
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
          <input type="hidden" name="goal_id" value={goal.id} />
          {contribution && (
            <input type="hidden" name="id" value={contribution.id} />
          )}

          <div>
            <label htmlFor="contribution-amount" className="text-sm font-medium">
              Amount ({goal.currency})
            </label>
            <input
              id="contribution-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="2000"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div>
            <label htmlFor="contribution-date" className="text-sm font-medium">
              Date
            </label>
            <input
              id="contribution-date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div>
            <label htmlFor="contribution-note" className="text-sm font-medium">
              Note <span className="sw-muted">(optional)</span>
            </label>
            <input
              id="contribution-note"
              name="note"
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Salary leftover"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
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
                  : "Add contribution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
