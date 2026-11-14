import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(firstValue(params.next));
  const initialError = firstValue(params.error);

  return (
    <main
      className="relative grid min-h-screen place-items-center overflow-hidden p-4"
      style={{
        background:
          "radial-gradient(1200px 600px at 15% -10%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 60%), radial-gradient(900px 500px at 90% 110%, color-mix(in srgb, var(--ai) 14%, transparent), transparent 60%), var(--bg)",
      }}
    >
      <div className="sw-ambient" aria-hidden />
      <div className="relative z-10 w-full flex justify-center">
        <LoginForm nextPath={nextPath} initialError={initialError} />
      </div>
    </main>
  );
}
