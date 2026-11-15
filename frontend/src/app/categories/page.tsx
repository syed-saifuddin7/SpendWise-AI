import { Shell } from "@/components/spendwise/shell";
import { getCategoriesData } from "@/lib/data/categories";

import { CategoryDialog } from "./category-forms";
import { CategoriesView } from "./categories-view";

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: CategoriesPageProps) {
  const params = await searchParams;
  const data = await getCategoriesData(params);

  const dialogOpen = data.addMode || Boolean(data.editingCategory);

  return (
    <Shell
      title="Categories"
      subtitle="Organize transactions your way — an icon, a colour, and a side of the ledger."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <CategoriesView data={data} />

      {dialogOpen && (
        <CategoryDialog
          category={data.addMode ? null : data.editingCategory}
          closeHref="/categories"
        />
      )}
    </Shell>
  );
}
