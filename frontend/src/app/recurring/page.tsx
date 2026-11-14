import { Shell } from "@/components/spendwise/shell";
import { getRecurringData } from "@/lib/data/recurring";

import { RecurringDialog } from "./recurring-forms";
import { RecurringView } from "./recurring-view";

type RecurringPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: RecurringPageProps) {
  const params = await searchParams;
  const data = await getRecurringData(params);

  const dialogOpen = data.addMode || Boolean(data.editingItem);

  return (
    <Shell
      title="Recurring"
      subtitle="Predictable expenses, handled before you have to think about them."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <RecurringView data={data} />

      {dialogOpen && (
        <RecurringDialog
          item={data.addMode ? null : data.editingItem}
          categoryOptions={data.categoryOptions}
          closeHref="/recurring"
        />
      )}
    </Shell>
  );
}
