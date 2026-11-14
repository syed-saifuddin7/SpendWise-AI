const SUPABASE_URL = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to frontend/.env.local before starting the app.`,
    );
  }

  return value;
}

export function getSupabaseEnv() {
  return {
    url: required(SUPABASE_URL),
    key: required(SUPABASE_ANON_KEY),
  };
}
