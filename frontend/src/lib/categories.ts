const CATEGORY_EMOJI: Record<string, string> = {
  Food: "🍜",
  Groceries: "🛒",
  Travel: "🚕",
  Transport: "🚕",
  Shopping: "🛍️",
  Entertainment: "🎵",
  Bills: "🧾",
  Rent: "🏠",
  Health: "🩺",
  Education: "📚",
  Utilities: "💡",
  Salary: "💼",
  Freelance: "🧑‍💻",
  Business: "🏢",
  Interest: "🏦",
  Gift: "🎁",
  Transfer: "🔁",
  Other: "💸",
};

export const TRANSFER_CATEGORY_NAME = "Transfer";

export const DEFAULT_CATEGORY_NAMES = [
  "Food",
  "Groceries",
  "Travel",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Rent",
  "Health",
  "Education",
  "Utilities",
  "Other",
];

export const INCOME_CATEGORY_NAMES = [
  "Salary",
  "Freelance",
  "Business",
  "Interest",
  "Gift",
  "Other",
];

// ---------- kinds ----------
// A category's kind decides which picker it belongs in. "both" is for labels
// like Other that genuinely work either way.

export const CATEGORY_KINDS = ["expense", "income", "both"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_META: Record<
  CategoryKind,
  { label: string; emoji: string; blurb: string }
> = {
  expense: {
    label: "Expense",
    emoji: "💸",
    blurb: "Money going out — food, rent, bills.",
  },
  income: {
    label: "Income",
    emoji: "💵",
    blurb: "Money coming in — salary, freelance, interest.",
  },
  both: {
    label: "Both",
    emoji: "↔️",
    blurb: "Offer this category for income and expenses.",
  },
};

export function isCategoryKind(
  value: string | null | undefined,
): value is CategoryKind {
  return value === "expense" || value === "income" || value === "both";
}

export function categoryKindMeta(kind: string | null | undefined) {
  return isCategoryKind(kind) ? CATEGORY_KIND_META[kind] : CATEGORY_KIND_META.expense;
}

const DEFAULT_CATEGORY_KIND: Record<string, CategoryKind> = {
  Food: "expense",
  Groceries: "expense",
  Travel: "expense",
  Transport: "expense",
  Shopping: "expense",
  Entertainment: "expense",
  Bills: "expense",
  Rent: "expense",
  Health: "expense",
  Education: "expense",
  Utilities: "expense",
  Salary: "income",
  Freelance: "income",
  Business: "income",
  Interest: "income",
  Gift: "income",
  Transfer: "expense",
  Other: "both",
};

export function defaultCategoryKind(name: string): CategoryKind {
  return DEFAULT_CATEGORY_KIND[name] ?? "both";
}

/** True when a category of this kind should be offered for a transaction type. */
export function categoryFitsKind(
  kind: string | null | undefined,
  target: "expense" | "income",
) {
  return kind === "both" || kind === target;
}

// ---------- colours ----------
// A fixed palette keeps the app coherent (and keeps contrast predictable across
// light and dark themes) while still feeling personal.

export const CATEGORY_COLORS = [
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Red", value: "#ef4444" },
  { name: "Stone", value: "#78716c" },
] as const;

const DEFAULT_CATEGORY_COLOR: Record<string, string> = {
  Food: "#f97316",
  Groceries: "#22c55e",
  Travel: "#06b6d4",
  Transport: "#3b82f6",
  Shopping: "#ec4899",
  Entertainment: "#a855f7",
  Bills: "#f59e0b",
  Rent: "#78716c",
  Health: "#ef4444",
  Education: "#6366f1",
  Utilities: "#14b8a6",
  Salary: "#22c55e",
  Freelance: "#06b6d4",
  Business: "#3b82f6",
  Interest: "#14b8a6",
  Gift: "#ec4899",
  Transfer: "#78716c",
  Other: "#78716c",
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isCategoryColor(value: string | null | undefined) {
  return Boolean(value && HEX_COLOR.test(value));
}

/** Stored colour wins; otherwise built-in names get theirs, everything else
 *  gets a stable colour derived from the name so it never flickers. */
export function categoryColor(name: string, color?: string | null) {
  if (isCategoryColor(color)) return color as string;

  const known = DEFAULT_CATEGORY_COLOR[name];
  if (known) return known;

  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 100_000;
  }

  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length].value;
}

export function categoryEmoji(name: string, emoji?: string | null) {
  if (emoji) return emoji;
  return CATEGORY_EMOJI[name] ?? "💸";
}
