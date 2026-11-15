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

export function categoryEmoji(name: string, emoji?: string | null) {
  if (emoji) return emoji;
  return CATEGORY_EMOJI[name] ?? "💸";
}
