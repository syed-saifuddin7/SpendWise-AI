"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowLeftRight,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import { Metric, Section } from "@/components/spendwise/ui";
import type { WalletRow, WalletsData } from "@/lib/data/wallets";
import { formatMoney } from "@/lib/finance";
import { walletMeta } from "@/lib/wallets";

import { deleteWallet, toggleWallet } from "./actions";

function PendingIcon({
  icon,
  label,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10 ${className}`}
    >
      {icon}
    </button>
  );
}

function WalletCard({
  wallet,
  currency,
  monthKey,
}: {
  wallet: WalletRow;
  currency: string;
  monthKey: string;
}) {
  const meta = walletMeta(wallet.type);
  const isCredit = wallet.type === "credit";

  return (
    <div
      className={`sw-card sw-card-lift flex flex-col p-5 ${
        wallet.isActive ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xl"
          style={{ background: "var(--bg)" }}
        >
          {meta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold">{wallet.name}</h3>
            {!wallet.isActive && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "var(--bg)", color: "var(--muted)" }}
              >
                Archived
              </span>
            )}
          </div>
          <p className="truncate text-xs sw-muted">{meta.label}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs sw-muted">
          {isCredit ? "Current balance" : "Balance"}
        </p>
        <p
          className="mt-0.5 text-2xl font-black tracking-tight"
          style={{
            color: isCredit && wallet.balance < 0 ? "var(--danger)" : undefined,
          }}
        >
          {formatMoney(wallet.balance, currency)}
        </p>
        <p className="mt-1 text-xs sw-muted">
          Started at {formatMoney(wallet.openingBalance, currency)}
        </p>
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs"
        style={{ borderColor: "var(--line)" }}
      >
        <div>
          <div className="sw-muted">In this month</div>
          <div className="mt-0.5 font-semibold" style={{ color: "var(--brand)" }}>
            +{formatMoney(wallet.monthlyInflow, currency)}
          </div>
        </div>
        <div>
          <div className="sw-muted">Out this month</div>
          <div className="mt-0.5 font-semibold">
            −{formatMoney(wallet.monthlyOutflow, currency)}
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex items-center justify-between gap-2 border-t pt-3"
        style={{ borderColor: "var(--line)" }}
      >
        <Link
          href={`/transactions?month=${monthKey}&wallet=${wallet.id}`}
          scroll={false}
          className="flex items-center gap-1.5 text-xs font-semibold sw-muted transition hover:text-[var(--brand)]"
        >
          <ArrowLeftRight size={13} />
          {wallet.transactionCount} transaction
          {wallet.transactionCount === 1 ? "" : "s"}
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href={`/wallets?edit=${wallet.id}`}
            scroll={false}
            aria-label={`Edit ${wallet.name}`}
            title="Edit wallet"
            className="grid size-8 place-items-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Pencil size={15} />
          </Link>

          <form action={toggleWallet}>
            <input type="hidden" name="id" value={wallet.id} />
            <input type="hidden" name="activate" value={wallet.isActive ? "0" : "1"} />
            <PendingIcon
              icon={
                wallet.isActive ? <Archive size={15} /> : <ArchiveRestore size={15} />
              }
              label={wallet.isActive ? "Archive wallet" : "Restore wallet"}
            />
          </form>

          <form
            action={deleteWallet}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete "${wallet.name}"? If it has transactions it will be archived instead, so your history stays intact.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={wallet.id} />
            <PendingIcon
              icon={<Trash2 size={15} />}
              label="Delete wallet"
              className="hover:text-[var(--danger)]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export function WalletsView({ data }: { data: WalletsData }) {
  const addHref = "/wallets?add=1";
  const transactionsHref = `/transactions?month=${data.monthKey}`;

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
          <Link
            href="/wallets"
            scroll={false}
            aria-label="Dismiss"
            className="ml-auto"
          >
            <X size={15} />
          </Link>
        </div>
      )}

      <div className="sw-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Total balance"
          value={formatMoney(data.totalBalance, data.currency)}
          note={`${data.activeCount} active wallet${
            data.activeCount === 1 ? "" : "s"
          }`}
          icon={<Wallet size={17} />}
        />
        <Metric
          label="Net cash flow"
          value={formatMoney(data.monthlyNet, data.currency)}
          note="income minus spending this month"
          good={data.monthlyNet >= 0}
        />
        <Metric
          label="Spent this month"
          value={formatMoney(data.monthlySpending, data.currency)}
          note={`${data.monthLabel} · ${
            data.transactionCount
          } transactions overall`}
          good={false}
        />
        <Metric
          label="Liquid balance"
          value={formatMoney(data.liquidBalance, data.currency)}
          note={
            data.investedBalance > 0
              ? `${formatMoney(data.investedBalance, data.currency)} invested`
              : "Bank, cash and digital wallets"
          }
        />
      </div>

      <div className="mt-4">
        <Section
          title="Your wallets"
          action={<span className="text-xs sw-muted">{data.monthLabel}</span>}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm sw-muted">
              Money lives here. Every expense, income entry and transfer moves
              between these accounts.
            </p>
            <div className="flex gap-2">
              <Link
                href={transactionsHref}
                scroll={false}
                className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: "var(--line)" }}
              >
                <ArrowLeftRight size={15} />
                View ledger
              </Link>
              <Link
                href={addHref}
                scroll={false}
                className="sw-glow sw-shine flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Add wallet
              </Link>
            </div>
          </div>

          {data.wallets.length ? (
            <div className="sw-stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.wallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  currency={data.currency}
                  monthKey={data.monthKey}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Wallet className="mx-auto sw-muted" size={30} />
              <p className="mt-3 font-semibold">No wallets yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm sw-muted">
                Add the bank account, cash stash or card you spend from. You can
                track balances and move money between them.
              </p>
              <Link
                href={addHref}
                scroll={false}
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                <Plus size={16} />
                Add your first wallet
              </Link>
            </div>
          )}

          <p className="mt-4 text-xs sw-muted">
            Balance = opening balance + income − expenses ± transfers. Archived
            wallets keep their history but stop counting toward your total.
            {data.creditBalance !== 0
              ? ` Credit cards currently sit at ${formatMoney(
                  data.creditBalance,
                  data.currency,
                )}.`
              : ""}
          </p>
        </Section>
      </div>
    </div>
  );
}
