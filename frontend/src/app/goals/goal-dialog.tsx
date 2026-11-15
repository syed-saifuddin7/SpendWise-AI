"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { GoalRow } from "@/lib/data/goals";
import { formatMoney } from "@/lib/finance";
import { GOAL_EMOJIS } from "@/lib/goals";

import { saveGoal } from "./actions";

type GoalDialogProps = {
  goal: GoalRow | null;
  currency: string;
  today: string;
  closeHref: string;
};

export function GoalDialog({ goal, currency, today, closeHref }: GoalDialogProps) {
  const [state, formAction, pending] = useActionState(saveGoal, undefined);

  const dialogCurrency = goal?.currency ?? currency;
  const [name, setName] = useState(goal?.name ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [target, setTarget] = useState(
    goal ? String(goal.targetAmount) : "",
  );
  const [starting, setStarting] = useState(
    goal ? String(goal.startingAmount) : "",
  );
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [note, setNote] = useState(goal?.note ?? "");

  const isEditing = Boolean(goal);

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
              {isEditing ? "Edit goal" : "Create a goal"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Change what you are saving for. Contributions stay untouched."
                : "Name the thing you are saving for and how much it costs."}
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
          {goal && <input type="hidden" name="id" value={goal.id} />}
          <input type="hidden" name="currency" value={dialogCurrency} />
          <input type="hidden" name="emoji" value={emoji} />

          <div>
            <label htmlFor="goal-name" className="text-sm font-medium">
              Goal name
            </label>
            <input
              id="goal-name"
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. New laptop"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div>
            <span className="text-sm font-medium">Icon</span>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Goal icon">
              {GOAL_EMOJIS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Use ${option}`}
                  aria-pressed={emoji === option}
                  onClick={() => setEmoji(option)}
                  className="grid size-9 place-items-center rounded-lg border text-lg transition"
                  style={{
                    borderColor: emoji === option ? "var(--brand)" : "var(--line)",
                    background:
                      emoji === option ? "var(--brand-soft)" : "transparent",
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="goal-target" className="text-sm font-medium">
                Target amount ({dialogCurrency})
              </label>
              <input
                id="goal-target"
                name="target_amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="80000"
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label htmlFor="goal-starting" className="text-sm font-medium">
                Already saved ({dialogCurrency})
              </label>
              <input
                id="goal-starting"
                name="starting_amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={starting}
                onChange={(event) => setStarting(event.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
              <p className="mt-1.5 text-xs sw-muted">
                Money you put aside before tracking it here.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="goal-date" className="text-sm font-medium">
              Target date <span className="sw-muted">(optional)</span>
            </label>
            <input
              id="goal-date"
              name="target_date"
              type="date"
              min={today}
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div>
            <label htmlFor="goal-note" className="text-sm font-medium">
              Note <span className="sw-muted">(optional)</span>
            </label>
            <input
              id="goal-note"
              name="note"
              maxLength={280}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why this goal matters"
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
              {pending ? "Saving..." : isEditing ? "Save changes" : "Create goal"}
            </button>
          </div>
        </form>

        {goal && (
          <p className="mt-3 text-center text-xs sw-muted">
            {goal.contributionCount} contribution
            {goal.contributionCount === 1 ? "" : "s"} ·{" "}
            {formatMoney(goal.saved, dialogCurrency)} saved so far
          </p>
        )}
      </div>
    </div>
  );
}
