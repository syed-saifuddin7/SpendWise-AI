import { todayKey } from "@/lib/dates";

export const RECURRING_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MS_PER_DAY = 86_400_000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateKey(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function isRecurringFrequency(
  value: string | null | undefined,
): value is RecurringFrequency {
  return (
    value === "weekly" || value === "monthly" || value === "yearly"
  );
}

export function frequencyLabel(frequency: string | null | undefined) {
  return isRecurringFrequency(frequency)
    ? FREQUENCY_LABELS[frequency]
    : "Monthly";
}

/**
 * Mirrors `process_due_recurring_expenses` in `cloud_db.py`:
 * weekly adds 7 days, monthly advances one month and clamps the day to the
 * target month's length, yearly advances one year and turns Feb 29 into Feb 28.
 */
export function nextOccurrence(
  dateKey: string,
  frequency: string | null | undefined,
): string {
  const { year, month, day } = parseDateKey(dateKey);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateKey;
  }

  if (frequency === "weekly") {
    const next = new Date(year, month - 1, day + 7);
    return makeDateKey(next.getFullYear(), next.getMonth() + 1, next.getDate());
  }

  if (frequency === "yearly") {
    const nextYear = year + 1;
    const nextDay = Math.min(day, daysInMonth(nextYear, month));
    return makeDateKey(nextYear, month, nextDay);
  }

  let nextMonth = month + 1;
  let nextYear = year;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return makeDateKey(nextYear, nextMonth, nextDay);
}

export function daysUntil(dateKey: string, from = todayKey()) {
  const target = parseDateKey(dateKey);
  const start = parseDateKey(from);

  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);

  return Math.round((targetUtc - startUtc) / MS_PER_DAY);
}

export function monthlyEquivalent(
  amount: number,
  frequency: string | null | undefined,
) {
  if (frequency === "weekly") {
    return (amount * 52) / 12;
  }

  if (frequency === "yearly") {
    return amount / 12;
  }

  return amount;
}

export function ordinal(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) return `${value}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`;

  return `${value}th`;
}

export function cadenceLabel(
  frequency: string | null | undefined,
  startDate: string,
) {
  const { month, day } = parseDateKey(startDate);

  if (frequency === "weekly") return "Every week";
  if (frequency === "yearly") return `Yearly on ${day} ${MONTH_SHORT[month - 1]}`;

  return `Monthly on the ${ordinal(day)}`;
}

export function dueLabel(days: number) {
  if (days < 0) {
    return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  }

  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
}
