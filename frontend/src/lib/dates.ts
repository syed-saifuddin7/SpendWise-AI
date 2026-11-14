const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function currentMonthKey() {
  return monthKeyOf(new Date());
}

export function isValidMonthKey(value: string | undefined | null): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

export function normalizeMonthKey(
  value: string | undefined | null,
  fallback: string,
) {
  return isValidMonthKey(value) ? value : fallback;
}

export function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  return monthKeyOf(new Date(year, month - 1 + offset, 1));
}

export function monthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month, 1);

  return {
    year,
    month,
    daysInMonth: new Date(year, month, 0).getDate(),
    start: `${monthKey}-01`,
    nextStart: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`,
  };
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function isValidDateKey(value: string) {
  if (!DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function todayKey() {
  const now = new Date();
  return `${monthKeyOf(now)}-${pad(now.getDate())}`;
}

export function formatExpenseDate(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
