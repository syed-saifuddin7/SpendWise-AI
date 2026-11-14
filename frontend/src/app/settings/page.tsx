import { Shell } from "@/components/spendwise/shell";
import { getSettingsData } from "@/lib/data/settings";

import { SettingsView } from "./settings-view";

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const data = await getSettingsData(params);

  return (
    <Shell
      title="Settings"
      subtitle="Personalize SpendWise and manage your account."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <SettingsView data={data} />
    </Shell>
  );
}
