import { Shell } from "@/components/spendwise/shell";
import { getBudgetsData } from "@/lib/data/budgets";

import { BudgetsView } from "./budgets-view";

type BudgetsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: BudgetsPageProps) {
  const params = await searchParams;
  const data = await getBudgetsData(params);

  return (
    <Shell
      title="Budgets"
      subtitle="Plan your spending before your money decides for you."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <BudgetsView data={data} />
    </Shell>
  );
}
