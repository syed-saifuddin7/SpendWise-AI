export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SGD: "S$",
};

export function getCurrencySymbol(currency: string | null | undefined) {
  const code = (currency || "INR").toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function formatMoney(
  amount: number,
  currency: string | null | undefined,
) {
  const code = (currency || "INR").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.abs(value % 1) > 0.004;

  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(value);
  } catch {
    return `${getCurrencySymbol(code)}${value.toFixed(hasFraction ? 2 : 0)}`;
  }
}

export type FinancialHealthExpense = {
  amount: number | string;
  date: string;
};

export type CategoryBudgetProgress = {
  name: string;
  spent: number;
  budget: number;
  percentage: number;
};

export type FinancialHealthComponent = {
  score: number | null;
  max: number;
};

export type FinancialHealth = {
  available: boolean;
  score: number | null;
  rating: string | null;
  reason?: string;
  monthlySpending: number;
  monthlyBudget: number;
  categoryBudgetsTracked: number;
  components?: {
    overallBudgetControl: FinancialHealthComponent;
    categoryBudgetControl: FinancialHealthComponent;
    spendingConsistency: FinancialHealthComponent;
    budgetHeadroom: FinancialHealthComponent;
  };
  positiveFactors: string[];
  attentionFactors: string[];
};

function overallBudgetScore(spending: number, budget: number) {
  if (budget <= 0) return null;

  const usage = spending / budget;

  if (usage <= 0.7) return 40;
  if (usage <= 0.8) return 36;
  if (usage <= 0.9) return 30;
  if (usage <= 1) return 22;
  if (usage <= 1.1) return 12;
  if (usage <= 1.25) return 6;

  return 0;
}

function spendingConsistencyScore(expenses: FinancialHealthExpense[]) {
  if (!expenses.length) return 20;

  const dailyTotals = new Map<string, number>();
  let total = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount) || 0;
    dailyTotals.set(expense.date, (dailyTotals.get(expense.date) ?? 0) + amount);
    total += amount;
  }

  if (total <= 0) return 20;

  const concentration = Math.max(...dailyTotals.values()) / total;

  if (concentration < 0.3) return 20;
  if (concentration < 0.4) return 16;
  if (concentration < 0.5) return 12;
  if (concentration < 0.65) return 7;

  return 2;
}

function budgetHeadroomScore(spending: number, budget: number) {
  if (budget <= 0) return null;

  const headroomRatio = (budget - spending) / budget;

  if (headroomRatio >= 0.3) return 15;
  if (headroomRatio >= 0.2) return 12;
  if (headroomRatio >= 0.1) return 8;
  if (headroomRatio > 0) return 4;

  return 0;
}

function categoryBudgetScore(progress: CategoryBudgetProgress[]) {
  if (!progress.length) return null;

  const healthValues: number[] = progress.map((info) => {
    const percentage = Number(info.percentage) || 0;

    if (percentage < 80) return 1;
    if (percentage < 100) return 0.7;
    if (percentage < 120) return 0.3;

    return 0;
  });

  const average =
    healthValues.reduce((total, value) => total + value, 0) /
    healthValues.length;

  return Math.round(average * 25 * 100) / 100;
}

export function getHealthRating(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Attention";
  return "Critical";
}

/**
 * Mirrors the Python Financial Health Score. Category budgets are optional:
 * when none exist, their 25 points are redistributed across the other
 * components, exactly like `financial_health.py`.
 */
export function calculateFinancialHealth(
  expenses: FinancialHealthExpense[],
  monthlyBudget: number,
  categoryBudgetProgress: CategoryBudgetProgress[] = [],
): FinancialHealth {
  const monthlySpending = expenses.reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0,
  );

  const overall = overallBudgetScore(monthlySpending, monthlyBudget);
  const headroom = budgetHeadroomScore(monthlySpending, monthlyBudget);
  const consistency = spendingConsistencyScore(expenses);
  const category = categoryBudgetScore(categoryBudgetProgress);

  const positiveFactors: string[] = [];
  const attentionFactors: string[] = [];

  if (overall === null || headroom === null) {
    return {
      available: false,
      score: null,
      rating: null,
      reason: "Set a monthly budget to enable your Financial Health Score.",
      monthlySpending,
      monthlyBudget,
      categoryBudgetsTracked: categoryBudgetProgress.length,
      positiveFactors,
      attentionFactors,
    };
  }

  const score =
    category === null
      ? Math.round(((overall + consistency + headroom) / (40 + 20 + 15)) * 100)
      : Math.round(overall + category + consistency + headroom);

  const finalScore = Math.max(0, Math.min(100, score));

  const budgetUsage =
    monthlyBudget > 0 ? (monthlySpending / monthlyBudget) * 100 : 0;

  if (budgetUsage <= 80) {
    positiveFactors.push(
      "Overall monthly spending is comfortably within budget.",
    );
  } else if (budgetUsage <= 100) {
    attentionFactors.push(
      "Overall monthly spending is close to the budget limit.",
    );
  } else {
    attentionFactors.push(
      "Overall monthly spending has exceeded the monthly budget.",
    );
  }

  for (const info of categoryBudgetProgress) {
    const percentage = Number(info.percentage) || 0;

    if (percentage >= 100) {
      attentionFactors.push(
        `${info.name} has exceeded its category budget.`,
      );
    } else if (percentage >= 80) {
      attentionFactors.push(
        `${info.name} is approaching its category budget limit.`,
      );
    }
  }

  if (consistency >= 16) {
    positiveFactors.push(
      "Spending is reasonably distributed across the month.",
    );
  } else if (consistency <= 7) {
    attentionFactors.push(
      "A large share of this month's spending occurred on a single day.",
    );
  }

  if (headroom >= 12) {
    positiveFactors.push(
      "A healthy portion of the monthly budget remains available.",
    );
  } else if (headroom === 0) {
    attentionFactors.push(
      "There is no remaining overall budget headroom.",
    );
  }

  return {
    available: true,
    score: finalScore,
    rating: getHealthRating(finalScore),
    monthlySpending,
    monthlyBudget,
    categoryBudgetsTracked: categoryBudgetProgress.length,
    components: {
      overallBudgetControl: { score: overall, max: 40 },
      categoryBudgetControl: { score: category, max: 25 },
      spendingConsistency: { score: consistency, max: 20 },
      budgetHeadroom: { score: headroom, max: 15 },
    },
    positiveFactors,
    attentionFactors,
  };
}
