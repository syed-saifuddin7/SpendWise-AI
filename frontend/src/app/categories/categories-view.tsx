import {
  Pencil,
  Plus,
  Sparkles,
  Tags,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";

import { Metric, Progress, Section } from "@/components/spendwise/ui";
import { categoryKindMeta } from "@/lib/categories";
import type { CategoriesData, CategoryItem } from "@/lib/data/categories";
import { formatMoney } from "@/lib/finance";

import { CategoryDeleteForm } from "./category-forms";

function CategoryUsage({
  category,
  currency,
}: {
  category: CategoryItem;
  currency: string;
}) {
  if (category.monthIncomeCount > 0 && category.monthCount === 0) {
    return (
      <>
        {category.monthIncomeCount} income this month ·{" "}
        {formatMoney(category.monthIncome, currency)} received
      </>
    );
  }

  if (category.monthCount > 0) {
    return (
      <>
        {category.monthCount} this month ·{" "}
        {formatMoney(category.monthSpent, currency)}
      </>
    );
  }

  if (category.incomeCount > 0 && category.expenseCount === 0) {
    return (
      <>
        {category.incomeCount} income entr
        {category.incomeCount === 1 ? "y" : "ies"} all time
      </>
    );
  }

  if (category.expenseCount > 0) {
    return (
      <>
        {category.expenseCount} expense
        {category.expenseCount === 1 ? "" : "s"} all time
      </>
    );
  }

  return <>Not used yet</>;
}

export function CategoriesView({ data }: { data: CategoriesData }) {
  return (
    <div>
      {data.notice && (
        <div
          className="sw-enter mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{
            background: `color-mix(in srgb, var(--${
              data.notice.type === "error" ? "danger" : "brand"
            }) 10%, transparent)`,
            color: `var(--${data.notice.type === "error" ? "danger" : "brand"})`,
          }}
        >
          {data.notice.message}
          <Link href="/categories" aria-label="Dismiss" className="ml-auto">
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm sw-muted">
          <span className="sw-dot mr-2 align-middle" />
          Built-in categories are always ready. Custom ones are yours to shape —
          icon, colour, and whether they belong to money in or money out.
        </p>
        <Link
          href="/categories?add=1"
          scroll={false}
          className="sw-glow sw-shine flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ background: "var(--brand)" }}
        >
          <Plus size={16} />
          Add category
        </Link>
      </div>

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Total categories"
          value={String(data.totalCount)}
          note={`${data.customCount} custom`}
          icon={<Tags size={17} />}
        />
        <Metric
          label="Income categories"
          value={String(data.incomeKindCount)}
          note={`${data.expenseKindCount} expense · ${data.bothKindCount} both`}
          icon={<TrendingUp size={17} />}
        />
        <Metric
          label="Used this month"
          value={`${data.usedCount} / ${data.totalCount}`}
          note={data.monthLabel}
          icon={<Tags size={17} />}
        />
        <Metric
          label="Spent this month"
          value={formatMoney(data.monthTotal, data.currency)}
          note={
            data.monthIncomeTotal > 0
              ? `${formatMoney(data.monthIncomeTotal, data.currency)} received`
              : data.monthTotal > 0
                ? "across all categories"
                : "No spending recorded yet"
          }
          good={data.monthTotal > 0 || data.monthIncomeTotal > 0}
          icon={<Sparkles size={17} />}
        />
        <Metric
          label="Top category"
          value={
            data.items.find((item) => item.monthSpent > 0)?.name ?? "—"
          }
          note={
            data.items[0]?.monthSpent
              ? `${Math.round(data.items[0].share)}% of spending`
              : "Add a transaction to see it"
          }
          icon={<Tags size={17} />}
        />
      </div>

      <div className="mt-4">
        <Section
          title="Your Categories"
          action={
            <span className="text-xs sw-muted">
              {formatMoney(data.monthTotal, data.currency)} in {data.monthLabel}
            </span>
          }
        >
          <div className="sw-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((category) => {
              const active = category.monthCount > 0;

              return (
                <div
                  key={`${category.custom ? "custom" : "builtin"}-${category.name}`}
                  className="sw-card sw-card-lift group p-4"
                  data-category={category.name}
                  data-kind={category.kind}
                  data-color={category.color}
                  style={{ background: active ? "var(--panel)" : "var(--bg)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-xl transition group-hover:scale-110"
                      style={{
                        background: `color-mix(in srgb, ${category.color} ${
                          active ? "20%" : "12%"
                        }, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${
                          category.color
                        } 35%, transparent)`,
                      }}
                    >
                      {category.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">
                          {category.name}
                        </span>
                        <span
                          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide sw-muted"
                          title={`${categoryKindMeta(category.kind).label} category`}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: category.color }}
                          />
                          {categoryKindMeta(category.kind).label}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={
                            category.custom
                              ? {
                                  background: "var(--brand-soft)",
                                  color: "var(--brand)",
                                }
                              : category.builtIn
                                ? {
                                    background: "var(--panel)",
                                    color: "var(--muted)",
                                    border: "1px solid var(--line)",
                                  }
                                : {
                                    background:
                                      "color-mix(in srgb, var(--warn) 12%, transparent)",
                                    color: "var(--warn)",
                                  }
                          }
                        >
                          {category.custom
                            ? "Custom"
                            : category.builtIn
                              ? "Built-in"
                              : "Legacy"}
                        </span>
                      </div>

                      <div className="mt-1 text-xs sw-muted">
                        <CategoryUsage
                          category={category}
                          currency={data.currency}
                        />
                      </div>
                    </div>

                    {category.custom && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          href={`/categories?edit=${category.id}`}
                          scroll={false}
                          aria-label={`Edit ${category.name}`}
                          title="Edit category"
                          className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Pencil size={14} />
                        </Link>
                        <CategoryDeleteForm category={category} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Progress value={category.share} color={category.color} />
                    <div className="mt-2 flex items-center justify-between text-[11px] sw-muted">
                      <span>
                        {category.monthCount > 0 && category.share > 0
                          ? `${Math.round(category.share)}% of this month`
                          : category.monthIncomeCount > 0
                            ? `${formatMoney(
                                category.monthIncome,
                                data.currency,
                              )} received`
                            : "No activity this month"}
                      </span>
                      {category.totalSpent > 0 ? (
                        <span>
                          {formatMoney(category.totalSpent, data.currency)} all
                          time
                        </span>
                      ) : category.totalIncome > 0 ? (
                        <span>
                          {formatMoney(category.totalIncome, data.currency)}{" "}
                          received
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <div
        className="sw-card sw-hero mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <b>Deleting a custom category is safe.</b>
          <p className="mt-1 text-sm sw-muted">
            Its expenses move to <b>Other</b> and its category budgets are
            removed, so your spending totals never disappear.
          </p>
        </div>
      </div>
    </div>
  );
}
