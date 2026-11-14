import { Shell } from "@/components/spendwise/shell";
import { getTransactionsData } from "@/lib/data/transactions";

import { ExpenseDialog } from "./expense-dialog";
import { TransactionsView } from "./transactions-view";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const data = await getTransactionsData(params);

  const dialogOpen = data.addMode || Boolean(data.editingExpense);

  const closeParams = new URLSearchParams({ month: data.monthKey });
  if (data.categoryFilter) closeParams.set("category", data.categoryFilter);
  if (data.query) closeParams.set("q", data.query);
  const closeHref = `/transactions?${closeParams.toString()}`;

  return (
    <Shell
      title="Transactions"
      subtitle="Every expense, in one place."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <TransactionsView data={data} />

      {dialogOpen && (
        <ExpenseDialog
          categories={data.categories}
          currency={data.currency}
          closeHref={closeHref}
          expense={data.addMode ? null : data.editingExpense}
        />
      )}
    </Shell>
  );
}
