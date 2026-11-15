import { Shell } from "@/components/spendwise/shell";
import { getTransactionsData } from "@/lib/data/transactions";

import { TransactionDialog } from "./transaction-dialog";
import { TransactionsView } from "./transactions-view";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const data = await getTransactionsData(params);

  const dialogOpen = data.addMode || Boolean(data.editingTransaction);

  const closeParams = new URLSearchParams({ month: data.monthKey });
  if (data.query) closeParams.set("q", data.query);
  if (data.categoryFilter) closeParams.set("category", data.categoryFilter);
  if (data.typeFilter) closeParams.set("type", data.typeFilter);
  if (data.walletFilter) closeParams.set("wallet", String(data.walletFilter));
  const closeHref = `/transactions?${closeParams.toString()}`;

  return (
    <Shell
      title="Transactions"
      subtitle="Income, expenses and transfers in one honest ledger."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <TransactionsView data={data} />

      {dialogOpen && (
        <TransactionDialog
          categories={data.categories}
          wallets={data.wallets}
          currency={data.currency}
          closeHref={closeHref}
          transaction={data.addMode ? null : data.editingTransaction}
          initialType={data.addKind}
        />
      )}
    </Shell>
  );
}
