import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const EXPORT_TABLES = [
  "transactions",
  "wallets",
  "expenses",
  "budgets",
  "category_budgets",
  "categories",
  "recurring_expenses",
  "chat_history",
  "user_settings",
] as const;

function isMissingTable(message: string, code?: string) {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /does not exist|schema cache|could not find the table/i.test(message)
  );
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to export your data." },
      { status: 401 },
    );
  }

  const exported: Record<string, unknown> = {};
  const unavailable: string[] = [];

  for (const table of EXPORT_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      // Optional tables (for example chat history) may not exist in every
      // deployment. Skip them instead of failing the whole export.
      if (isMissingTable(error.message, error.code)) {
        unavailable.push(table);
        continue;
      }

      return NextResponse.json(
        { error: `Could not export ${table}: ${error.message}` },
        { status: 500 },
      );
    }

    exported[table] = data ?? [];
  }

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      user_id: user.id,
      email: user.email ?? "",
    },
    ...exported,
    ...(unavailable.length > 0 ? { unavailable_tables: unavailable } : {}),
  };

  const filename = `spendwise-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
