import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
  ReceiptText,
} from "lucide-react";

import { categoryEmoji } from "@/lib/categories";
import { formatMoney } from "@/lib/finance";

import { money, txns } from "./data";

export function Metric({
  label,
  value,
  note,
  good = true,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  good?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="sw-card sw-card-lift p-5">
      <div className="flex items-center justify-between gap-3 text-sm sw-muted">
        <span>{label}</span>
        {icon && (
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg"
            style={{
              background: good
                ? "var(--brand-soft)"
                : "color-mix(in srgb, var(--danger) 12%, transparent)",
              color: good ? "var(--brand)" : "var(--danger)",
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {note && (
        <div
          className="mt-2 flex items-center gap-1 text-xs"
          style={{ color: good ? "var(--brand)" : "var(--danger)" }}
        >
          {good ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {note}
        </div>
      )}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`sw-card p-5 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TransactionList() {
  return (
    <div className="divide-y" style={{ borderColor: "var(--line)" }}>
      {txns.map((transaction, index) => (
        <div key={index} className="flex items-center gap-3 py-3.5">
          <div
            className="grid size-10 place-items-center rounded-xl"
            style={{ background: "var(--bg)" }}
          >
            {transaction.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{transaction.name}</div>
            <div className="text-xs sw-muted">
              {transaction.cat} · {transaction.date}
            </div>
          </div>
          <div
            className="text-right font-bold"
            style={{
              color:
                transaction.amount > 0 ? "var(--brand)" : "var(--text)",
            }}
          >
            {money(transaction.amount)}
          </div>
          <MoreHorizontal size={16} className="sw-muted" />
        </div>
      ))}
    </div>
  );
}

export type DashboardTransaction = {
  id: number | string;
  name: string;
  category: string;
  date: string;
  amount: number | string;
};

function formatDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function TransactionRows({
  transactions,
  currency,
}: {
  transactions: DashboardTransaction[];
  currency: string;
}) {
  if (!transactions.length) {
    return (
      <div className="py-10 text-center">
        <ReceiptText className="mx-auto sw-muted" size={28} />
        <p className="mt-3 font-semibold">No expenses yet</p>
        <p className="mt-1 text-sm sw-muted">
          Expenses you add in SpendWise will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="sw-stagger divide-y" style={{ borderColor: "var(--line)" }}>
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center gap-3 py-3.5">
          <div
            className="grid size-10 place-items-center rounded-xl text-lg"
            style={{ background: "var(--bg)" }}
          >
            {categoryEmoji(transaction.category)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{transaction.name}</div>
            <div className="text-xs sw-muted">
              {transaction.category || "Other"} · {formatDay(transaction.date)}
            </div>
          </div>
          <div className="text-right font-bold">
            {formatMoney(-(Number(transaction.amount) || 0), currency)}
          </div>
        </div>
      ))}
    </div>
  );
}

const MOCK_BAR_VALUES = [42, 56, 38, 72, 61, 84, 66, 75, 53, 88, 68, 77];

export function Bars({
  values = MOCK_BAR_VALUES,
  currency,
}: {
  values?: number[];
  currency?: string;
}) {
  const max = Math.max(...values, 1);
  const lastActiveIndex = values.reduce(
    (last, value, index) => (value > 0 ? index : last),
    -1,
  );

  return (
    <div className="flex h-44 items-end gap-1 pt-4">
      {values.map((value, index) => (
        <div
          key={index}
          className="group relative flex h-full flex-1 items-end"
          title={
            currency
              ? `Day ${index + 1}: ${formatMoney(value, currency)}`
              : `Day ${index + 1}`
          }
        >
          <div
            className="sw-bar w-full rounded-t-md transition-all group-hover:brightness-110"
            style={{
              height: `${value > 0 ? Math.max((value / max) * 100, 4) : 0}%`,
              background:
                index === lastActiveIndex
                  ? "linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 55%, transparent))"
                  : "linear-gradient(180deg, var(--brand-soft), color-mix(in srgb, var(--brand-soft) 35%, transparent))",
              minHeight: value > 0 ? 4 : 0,
              animationDelay: `${Math.min(index * 18, 500)}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className="sw-progress h-2 overflow-hidden rounded-full"
      style={{ background: "var(--line)" }}
    >
      <div
        className="sw-progress-fill h-full rounded-full"
        style={{
          width: `${clamped}%`,
          background:
            value > 90
              ? "linear-gradient(90deg, var(--warn), var(--danger))"
              : value > 75
                ? "linear-gradient(90deg, var(--brand), var(--warn))"
                : "linear-gradient(90deg, color-mix(in srgb, var(--brand) 65%, white), var(--brand))",
        }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 112,
  stroke = 10,
  color = "var(--brand)",
  ariaLabel,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="sw-ring-draw"
          style={
            {
              "--sw-circumference": `${circumference}`,
              filter: `drop-shadow(0 0 5px ${color})`,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-8 text-center">
      <ReceiptText className="mx-auto sw-muted" size={28} />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm sw-muted">{description}</p>
    </div>
  );
}
