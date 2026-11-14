"use client";

import { Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { signIn, signUp } from "./actions";

type LoginFormProps = {
  nextPath: string;
  initialError?: string;
};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    undefined,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    undefined,
  );

  const isSignIn = mode === "signin";
  const activeState = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <div className="sw-enter w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <div
          className="sw-glow grid size-11 place-items-center rounded-2xl text-xl font-black text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--ai) 60%, var(--brand)))",
          }}
        >
          S
        </div>
        <div>
          <div className="text-xl font-bold">
            SpendWise <span style={{ color: "var(--ai)" }}>AI</span>
          </div>
          <div className="text-[11px] uppercase tracking-widest sw-muted">
            Personal finance, in control
          </div>
        </div>
      </div>

      <div className="sw-card sw-shine p-6 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="mb-6">
          <h1 className="sw-gradient-text text-2xl font-bold tracking-tight">
            {isSignIn ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm sw-muted">
            {isSignIn
              ? "Sign in to see your spending, budgets, and insights."
              : "Start tracking your money across every device."}
          </p>
        </div>

        <div
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl p-1"
          style={{ background: "var(--bg)" }}
        >
          {(
            [
              ["signin", "Sign in"],
              ["signup", "Create account"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className="rounded-lg px-3 py-2 text-sm font-semibold transition"
              style={
                mode === value
                  ? { background: "var(--panel)", color: "var(--brand)" }
                  : { color: "var(--muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <form
          action={isSignIn ? signInAction : signUpAction}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div
              className="mt-2 flex items-center gap-2 rounded-xl border px-3"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            >
              <Mail size={16} className="sw-muted" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div
              className="mt-2 flex items-center gap-2 rounded-xl border px-3"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            >
              <LockKeyhole size={16} className="sw-muted" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>

          {(activeState?.error || initialError) && (
            <p
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
              }}
            >
              {activeState?.error ?? initialError}
            </p>
          )}

          {activeState?.message && (
            <p
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "color-mix(in srgb, var(--brand) 10%, transparent)",
                color: "var(--brand)",
              }}
            >
              {activeState.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="sw-glow flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "var(--brand)" }}
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending
              ? isSignIn
                ? "Signing in..."
                : "Creating account..."
              : isSignIn
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["🍜", "Track"],
            ["🎯", "Budget"],
            ["✨", "Insights"],
          ].map(([emoji, label]) => (
            <div
              key={label}
              className="rounded-xl border px-2 py-3 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="text-lg">{emoji}</div>
              <div className="mt-1 text-[11px] font-semibold sw-muted">
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-2 text-xs sw-muted">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <p>
            Your data is protected by Supabase authentication and row-level
            security. Only you can access your records.
          </p>
        </div>
      </div>
    </div>
  );
}
