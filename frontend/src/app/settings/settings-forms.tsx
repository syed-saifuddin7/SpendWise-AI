"use client";

import {
  Bot,
  Check,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Save,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  AI_RESPONSE_STYLES,
  AI_STYLE_BLURBS,
  SUPPORTED_CURRENCIES,
  type AiResponseStyle,
} from "@/lib/settings";

import { saveAiPreferences, saveFinance, saveProfile } from "./actions";

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl px-3 py-2 text-sm sw-enter"
      style={{
        background: "color-mix(in srgb, var(--danger) 10%, transparent)",
        color: "var(--danger)",
      }}
    >
      {message}
    </p>
  );
}

function SaveButton({
  label,
  pendingLabel,
  icon,
}: {
  label: string;
  pendingLabel: string;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      style={{ background: "var(--brand)" }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : icon}
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ProfileForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [state, formAction] = useActionState(saveProfile, undefined);
  const [name, setName] = useState(displayName);
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--ai) 65%, var(--brand)))",
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="settings-display-name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="settings-display-name"
            name="display_name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="How should SpendWise address you?"
            className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="settings-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="settings-email"
          value={email}
          readOnly
          className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm sw-muted outline-none"
          style={{ borderColor: "var(--line)", background: "var(--bg)" }}
        />
        <p className="mt-1 text-xs sw-muted">
          Your email is managed by your authenticated Supabase account.
        </p>
      </div>

      {state?.error && <ErrorNote message={state.error} />}

      <div className="flex justify-end">
        <SaveButton label="Save profile" pendingLabel="Saving..." icon={<UserRound size={16} />} />
      </div>
    </form>
  );
}

export function FinanceForm({
  currency,
  defaultMonthlyBudget,
  currentBudget,
  currentMonthLabel,
}: {
  currency: string;
  defaultMonthlyBudget: number;
  currentBudget: number;
  currentMonthLabel: string;
}) {
  const [state, formAction] = useActionState(saveFinance, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="settings-currency" className="text-sm font-medium">
          Primary currency
        </label>
        <select
          id="settings-currency"
          name="currency"
          defaultValue={currency}
          className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
          style={{ borderColor: "var(--line)" }}
        >
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} ({option.symbol.trim()}) · {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs sw-muted">
          Changes how every amount is formatted across SpendWise.
        </p>
      </div>

      <div>
        <label
          htmlFor="settings-default-budget"
          className="text-sm font-medium"
        >
          Default monthly budget
        </label>
        <input
          id="settings-default-budget"
          name="default_monthly_budget"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          defaultValue={defaultMonthlyBudget || ""}
          placeholder="0.00"
          className="mt-2 w-full rounded-xl border bg-transparent p-3 text-sm outline-none focus:border-[var(--brand)]"
          style={{ borderColor: "var(--line)" }}
        />
        <p className="mt-1 text-xs sw-muted">
          {currentBudget > 0
            ? `${currentMonthLabel} already has a budget, so this default will not overwrite it.`
            : `Used automatically when a month has no budget yet. ${currentMonthLabel} has none.`}
        </p>
      </div>

      {state?.error && <ErrorNote message={state.error} />}

      <div className="flex justify-end">
        <SaveButton
          label="Save preferences"
          pendingLabel="Saving..."
          icon={<Save size={16} />}
        />
      </div>
    </form>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div>
      <span className="flex items-center gap-2 text-sm font-medium">
        <Palette size={15} className="sw-muted" />
        Appearance
      </span>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => {
          const active = theme === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition hover:-translate-y-0.5"
              style={{
                borderColor: active ? "var(--brand)" : "var(--line)",
                background: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--brand)" : "var(--text)",
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs sw-muted">
        System follows your device&apos;s light or dark setting.
      </p>
    </div>
  );
}

export function AiForm({
  responseStyle,
  proactiveTips,
}: {
  responseStyle: AiResponseStyle;
  proactiveTips: boolean;
}) {
  const [state, formAction] = useActionState(saveAiPreferences, undefined);
  const [style, setStyle] = useState<AiResponseStyle>(responseStyle);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className="flex items-center gap-2 text-sm font-medium">
          <Bot size={15} className="sw-muted" />
          Response style
        </span>
        <div className="mt-2 grid gap-2">
          {AI_RESPONSE_STYLES.map((option) => {
            const active = style === option;

            return (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
                style={{
                  borderColor: active ? "var(--brand)" : "var(--line)",
                  background: active ? "var(--brand-soft)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="ai_response_style"
                  value={option}
                  checked={active}
                  onChange={() => setStyle(option)}
                  className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {option}
                    {active && (
                      <Check size={14} style={{ color: "var(--brand)" }} />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs sw-muted">
                    {AI_STYLE_BLURBS[option]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <label
        htmlFor="settings-ai-tips"
        className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3"
        style={{ borderColor: "var(--line)" }}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            Allow proactive spending tips
          </span>
          <span className="mt-0.5 block text-xs sw-muted">
            SpendWise may surface gentle suggestions based on your own data.
          </span>
        </span>
        <input
          id="settings-ai-tips"
          name="ai_proactive_tips"
          type="checkbox"
          value="1"
          defaultChecked={proactiveTips}
          className="mt-1 size-5 shrink-0 accent-[var(--brand)]"
        />
      </label>

      {state?.error && <ErrorNote message={state.error} />}

      <div className="flex justify-end">
        <SaveButton
          label="Save AI preferences"
          pendingLabel="Saving..."
          icon={<Bot size={16} />}
        />
      </div>
    </form>
  );
}
