import { Shell } from "@/components/spendwise/shell";
import { getGoalsData } from "@/lib/data/goals";

import { ContributionDialog } from "./contribution-dialog";
import { GoalDialog } from "./goal-dialog";
import { GoalsView } from "./goals-view";

type GoalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: GoalsPageProps) {
  const params = await searchParams;
  const data = await getGoalsData(params);

  const goalDialogOpen = data.addMode || Boolean(data.editingGoal);

  const contributionGoal = data.editingContribution
    ? (data.goals.find(
        (goal) => goal.id === data.editingContribution?.goalId,
      ) ?? null)
    : data.contributingGoal;

  return (
    <Shell
      title="Goals"
      subtitle="Turn someday into a date, an amount, and a bar that fills up."
      user={{ name: data.user.name, email: data.user.email }}
    >
      <GoalsView data={data} />

      {goalDialogOpen && (
        <GoalDialog
          goal={data.addMode ? null : data.editingGoal}
          currency={data.currency}
          today={data.today}
          closeHref="/goals"
        />
      )}

      {contributionGoal && (
        <ContributionDialog
          goal={contributionGoal}
          contribution={data.editingContribution}
          today={data.today}
          closeHref="/goals"
        />
      )}
    </Shell>
  );
}
