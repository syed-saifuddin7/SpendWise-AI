"use client";

import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { WalletRow } from "@/lib/data/wallets";
import { WALLET_TYPES, type WalletType } from "@/lib/types";
import { WALLET_META } from "@/lib/wallets";

import { saveWallet } from "./actions";

type WalletDialogProps = {
  wallet: WalletRow | null;
  currency: string;
  closeHref: string;
};

export function WalletDialog({ wallet, currency, closeHref }: WalletDialogProps) {
  const [state, formAction, pending] = useActionState(saveWallet, undefined);

  const [name, setName] = useState(wallet?.name ?? "");
  const [type, setType] = useState<WalletType>(wallet?.type ?? "bank");
  const [openingBalance, setOpeningBalance] = useState(
    wallet ? String(wallet.openingBalance) : "",
  );

  const isEditing = Boolean(wallet);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close dialog"
        className="absolute inset-0"
      />

      <div className="sw-card sw-pop relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit wallet" : "Add wallet"}
            </h2>
            <p className="mt-1 text-sm sw-muted">
              {isEditing
                ? "Update where this wallet lives and what it started with."
                : "Create an account so every transaction knows where the money moved."}
            </p>
          </div>
          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X size={18} />
          </Link>
        </div>

        <form action={formAction} className="space-y-4">
          {wallet && <input type="hidden" name="id" value={wallet.id} />}
          <input type="hidden" name="currency" value={currency} />

          <div>
            <label htmlFor="wallet-name" className="text-sm font-medium">
              Wallet name
            </label>
            <input
              id="wallet-name"
              name="name"
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. HDFC Bank"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
          </div>

          <div>
            <label htmlFor="wallet-type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="wallet-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as WalletType)}
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            >
              {WALLET_TYPES.map((option) => (
                <option key={option} value={option}>
                  {WALLET_META[option].emoji} {WALLET_META[option].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs sw-muted">
              {WALLET_META[type].blurb}.
            </p>
          </div>

          <div>
            <label htmlFor="wallet-opening" className="text-sm font-medium">
              Opening balance ({currency})
            </label>
            <input
              id="wallet-opening"
              name="opening_balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              placeholder="0.00"
              className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            />
            <p className="mt-1.5 text-xs sw-muted">
              What this wallet holds today, before SpendWise transactions.
              Credit cards can start negative.
            </p>
          </div>

          {state?.error && (
            <p
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
              }}
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Link
              href={closeHref}
              scroll={false}
              className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
              style={{ borderColor: "var(--line)" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: "var(--brand)" }}
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              {pending ? "Saving..." : isEditing ? "Save changes" : "Add wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
