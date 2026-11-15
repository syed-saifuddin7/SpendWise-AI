"use client";

import { Loader2, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  CATEGORY_COLORS,
  CATEGORY_KINDS,
  categoryKindMeta,
  type CategoryKind,
} from "@/lib/categories";
import type { CategoryItem } from "@/lib/data/categories";

import { deleteCategory, saveCategory } from "./actions";

const EMOJI_CHOICES = [
  "🍜",
  "🛒",
  "🚕",
  "🛍️",
  "🎵",
  "🧾",
  "🏠",
  "🩺",
  "📚",
  "💡",
  "🎮",
  "✈️",
  "🐾",
  "🎁",
  "💼",
  "💸",
];

export function CategoryDialog({
  category,
  closeHref,
}: {
  category: CategoryItem | null;
  closeHref: string;
}) {
  const [state, formAction, pending] = useActionState(saveCategory, undefined);
  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(
    category?.emoji && category.emoji !== "💸" ? category.emoji : "",
  );
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [color, setColor] = useState<string>(
    category?.color ?? CATEGORY_COLORS[0].value,
  );

  const isEditing = Boolean(category);
  const kindMeta = categoryKindMeta(kind);

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
              {isEditing ? "Edit category" : "Add category"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Renaming a category updates its expenses and budgets too."
                : "Create a category that fits the way you actually spend."}
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
          {category?.id != null && (
            <input type="hidden" name="id" value={category.id} />
          )}
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="color" value={color} />

          <div className="flex items-center gap-3">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl transition"
              style={{
                background: `color-mix(in srgb, ${color} 18%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
              }}
            >
              {emoji || "🏷️"}
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="category-name" className="text-sm font-medium">
                Category name
              </label>
              <input
                id="category-name"
                name="name"
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Gaming, Fuel, College"
                className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="category-emoji" className="text-sm font-medium">
              Emoji <span className="sw-muted">(optional)</span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="category-emoji"
                name="emoji"
                maxLength={16}
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                placeholder="🏷️"
                className="w-20 rounded-xl border bg-transparent p-3 text-center text-lg outline-none focus:border-[var(--brand)]"
                style={{ borderColor: "var(--line)" }}
              />
              <button
                type="button"
                onClick={() => setEmoji("")}
                className="rounded-lg px-2 py-1 text-xs sw-muted transition hover:text-[var(--danger)]"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setEmoji(choice)}
                  aria-label={`Use ${choice}`}
                  aria-pressed={emoji === choice}
                  className="grid size-9 place-items-center rounded-lg text-lg transition hover:-translate-y-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                  style={
                    emoji === choice
                      ? {
                          background: "var(--brand-soft)",
                          boxShadow: "inset 0 0 0 1px var(--brand)",
                        }
                      : undefined
                  }
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">Kind</span>
            <p className="mt-1 text-xs sw-muted">
              Income categories are offered when you record money in, expense
              categories when you record money out.
            </p>
            <div
              className="mt-2 grid grid-cols-3 gap-2"
              role="group"
              aria-label="Category kind"
            >
              {CATEGORY_KINDS.map((option) => {
                const optionMeta = categoryKindMeta(option);
                const selected = kind === option;

                return (
                  <button
                    key={option}
                    id={`category-kind-${option}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setKind(option)}
                    className="rounded-xl border p-2.5 text-center transition"
                    style={{
                      borderColor: selected ? "var(--brand)" : "var(--line)",
                      background: selected ? "var(--brand-soft)" : "transparent",
                    }}
                  >
                    <span className="block text-lg leading-none">
                      {optionMeta.emoji}
                    </span>
                    <span className="mt-1 block text-xs font-semibold">
                      {optionMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs sw-muted">{kindMeta.blurb}</p>
          </div>

          <div>
            <span className="text-sm font-medium">Colour</span>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label="Category colour"
            >
              {CATEGORY_COLORS.map((swatch) => {
                const selected = color.toLowerCase() === swatch.value;

                return (
                  <button
                    key={swatch.value}
                    id={`category-color-${swatch.name.toLowerCase()}`}
                    type="button"
                    aria-label={`Use ${swatch.name}`}
                    aria-pressed={selected}
                    title={swatch.name}
                    onClick={() => setColor(swatch.value)}
                    className="size-8 rounded-full transition hover:scale-110"
                    style={{
                      background: swatch.value,
                      boxShadow: selected
                        ? "0 0 0 2px var(--panel), 0 0 0 4px var(--brand)"
                        : "none",
                    }}
                  />
                );
              })}
            </div>
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

          <div
            className="flex items-start gap-2 rounded-xl p-3 text-xs sw-muted"
            style={{ background: "var(--bg)" }}
          >
            <Sparkles
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--ai)" }}
            />
            <p>
              Custom categories are private to your account and appear
              everywhere you record an expense.
            </p>
          </div>

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
                  : "Add category"}
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
      aria-label="Delete category"
      title="Delete category"
      className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
      style={{ color: "var(--danger)" }}
    >
      <Trash2 size={15} />
    </button>
  );
}

export function CategoryDeleteForm({ category }: { category: CategoryItem }) {
  return (
    <form
      action={deleteCategory}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete "${category.name}"? Its expenses will move to Other and its category budgets will be removed.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={category.id ?? ""} />
      <DeleteSubmit />
    </form>
  );
}
