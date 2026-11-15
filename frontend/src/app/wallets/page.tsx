import { Shell } from "@/components/spendwise/shell";
import { getWalletsData } from "@/lib/data/wallets";

import { WalletDialog } from "./wallet-dialog";
import { WalletsView } from "./wallets-view";

type WalletsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: WalletsPageProps) {
  const params = await searchParams;
  const data = await getWalletsData(params);

  const dialogOpen = data.addMode || Boolean(data.editingWallet);

  return (
    <Shell
      title="Wallets"
      subtitle="One home for every account, balance and transfer."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <WalletsView data={data} />

      {dialogOpen && (
        <WalletDialog
          wallet={data.addMode ? null : data.editingWallet}
          currency={data.currency}
          closeHref="/wallets"
        />
      )}
    </Shell>
  );
}
