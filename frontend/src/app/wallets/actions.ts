"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupportedCurrency } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { isWalletType } from "@/lib/types";

export type WalletFormState = { error: string } | undefined;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function walletsUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/wallets?${query}` : "/wallets";
}

function revalidateWalletAreas() {
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
  revalidatePath("/monthly-summary");
  revalidatePath("/recurring");
  revalidatePath("/settings");
}

function friendlyError(message: string) {
  const text = message.toLowerCase();

  if (text.includes("duplicate") || text.includes("unique")) {
    return "You already have a wallet with this name.";
  }

  return message;
}

export async function saveWallet(
  _previousState: WalletFormState,
  formData: FormData,
): Promise<WalletFormState> {
  const id = readText(formData, "id");
  const name = readText(formData, "name").replace(/\s+/g, " ");
  const type = readText(formData, "type") || "bank";
  const currency = readText(formData, "currency");
  const openingValue = readText(formData, "opening_balance");

  if (!name) {
    return { error: "Give this wallet a name." };
  }

  if (name.length > 60) {
    return { error: "Wallet name must be 60 characters or fewer." };
  }

  if (!isWalletType(type)) {
    return { error: "Choose a valid wallet type." };
  }

  if (!isSupportedCurrency(currency)) {
    return { error: "Choose a supported currency." };
  }

  const openingBalance = openingValue === "" ? 0 : Number(openingValue.replace(/,/g, ""));

  if (!Number.isFinite(openingBalance)) {
    return { error: "Enter a valid opening balance." };
  }

  if (Math.abs(openingBalance) > 1_000_000_000) {
    return { error: "That opening balance looks too large." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fwallets");
  }

  const { data: existingWallets, error: existingError } = await supabase
    .from("wallets")
    .select("id, name")
    .eq("user_id", user.id);

  if (existingError) {
    return { error: `Could not check your wallets: ${existingError.message}` };
  }

  const duplicate = (existingWallets ?? []).find(
    (wallet) =>
      String(wallet.name).toLowerCase() === name.toLowerCase() &&
      String(wallet.id) !== id,
  );

  if (duplicate) {
    return { error: "You already have a wallet with this name." };
  }

  const record = {
    name,
    type,
    currency,
    opening_balance: Math.round(openingBalance * 100) / 100,
  };

  if (id) {
    if (!/^\d+$/.test(id)) {
      return { error: "That wallet could not be found." };
    }

    const { data: walletRow, error: walletError } = await supabase
      .from("wallets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      return { error: `Could not update the wallet: ${walletError.message}` };
    }

    if (!walletRow) {
      return { error: "That wallet could not be found." };
    }

    const { error } = await supabase
      .from("wallets")
      .update(record)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { error: friendlyError(`Could not update the wallet: ${error.message}`) };
    }

    revalidateWalletAreas();
    redirect(walletsUrl({ saved: "updated" }));
  }

  const { error } = await supabase.from("wallets").insert({
    ...record,
    user_id: user.id,
    is_active: true,
  });

  if (error) {
    return { error: friendlyError(`Could not add the wallet: ${error.message}`) };
  }

  revalidateWalletAreas();
  redirect(walletsUrl({ saved: "added" }));
}

export async function toggleWallet(formData: FormData) {
  const id = readText(formData, "id");
  const activate = readText(formData, "activate") === "1";

  if (!/^\d+$/.test(id)) {
    redirect(walletsUrl({ error: "That wallet could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fwallets");
  }

  const { error } = await supabase
    .from("wallets")
    .update({ is_active: activate })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(walletsUrl({ error: `Could not update the wallet: ${error.message}` }));
  }

  revalidateWalletAreas();
  redirect(activate ? walletsUrl({ restored: "1" }) : walletsUrl({ archived: "1" }));
}

export async function deleteWallet(formData: FormData) {
  const id = readText(formData, "id");

  if (!/^\d+$/.test(id)) {
    redirect(walletsUrl({ error: "That wallet could not be found." }));
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=%2Fwallets");
  }

  const { data: walletRow, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError) {
    redirect(walletsUrl({ error: `Could not load the wallet: ${walletError.message}` }));
  }

  if (!walletRow) {
    redirect(walletsUrl({ error: "That wallet could not be found." }));
  }

  // A wallet that has history is archived instead of removed, so transactions
  // never lose the account they belong to.
  const { data: linked, error: linkedError } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", user.id)
    .or(`wallet_id.eq.${id},transfer_wallet_id.eq.${id}`)
    .limit(1);

  if (linkedError) {
    redirect(
      walletsUrl({ error: `Could not check wallet activity: ${linkedError.message}` }),
    );
  }

  if (linked?.length) {
    const { error } = await supabase
      .from("wallets")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      redirect(walletsUrl({ error: `Could not archive the wallet: ${error.message}` }));
    }

    revalidateWalletAreas();
    redirect(walletsUrl({ archived: "1" }));
  }

  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(walletsUrl({ error: `Could not delete the wallet: ${error.message}` }));
  }

  revalidateWalletAreas();
  redirect(walletsUrl({ deleted: "1" }));
}
