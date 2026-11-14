export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
] as const;

export const AI_RESPONSE_STYLES = ["Concise", "Balanced", "Detailed"] as const;

export type AiResponseStyle = (typeof AI_RESPONSE_STYLES)[number];

export const AI_STYLE_BLURBS: Record<AiResponseStyle, string> = {
  Concise: "Short answers that get straight to the point.",
  Balanced: "A comfortable mix of detail and brevity.",
  Detailed: "Deeper explanations and fuller breakdowns.",
};

export function isSupportedCurrency(value: string | null | undefined) {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === value);
}

export function normalizeAiStyle(
  value: string | null | undefined,
): AiResponseStyle {
  return AI_RESPONSE_STYLES.includes(value as AiResponseStyle)
    ? (value as AiResponseStyle)
    : "Balanced";
}
