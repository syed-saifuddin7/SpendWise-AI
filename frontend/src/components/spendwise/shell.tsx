"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  WalletCards,
  ChartNoAxesCombined,
  CalendarDays,
  FileText,
  Settings,
  Repeat2,
  Tags,
  Upload,
  Sparkles,
  Target,
  CreditCard,
  Plus,
  Menu,
  Sun,
  Moon,
  Search,
  Bell,
  LogOut,
  X,
} from "lucide-react";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Transactions", "/transactions", ArrowLeftRight],
  ["Budgets", "/budgets", WalletCards],
  ["Goals", "/goals", Target],
  ["Bills & Subscriptions", "/bills", CreditCard],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", ChartNoAxesCombined],
  ["Monthly Summary", "/monthly-summary", CalendarDays],
  ["Reports", "/reports", FileText],
  ["Recurring", "/recurring", Repeat2],
  ["Categories", "/categories", Tags],
  ["Import", "/import", Upload],
  ["SpendWise AI", "/ai", Sparkles],
  ["Settings", "/settings", Settings],
] as const;

type ShellUser = {
  name: string;
  email: string;
};

export function Shell({
  children,
  title,
  subtitle,
  user,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  user?: ShellUser;
}) {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [mobile, setMobile] = useState(false);
  const [quick, setQuick] = useState(false);

  const displayName = user?.name || "SpendWise User";
  const displayEmail = user?.email || "Personal workspace";
  const initial = displayName.charAt(0).toUpperCase() || "S";

  return (
    <div className="min-h-screen md:pl-[250px]">
      <div className="sw-ambient" aria-hidden />

      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[250px] border-r md:flex md:flex-col"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand) 5%, var(--panel)), var(--panel) 38%)",
          borderColor: "var(--line)",
        }}
      >
        <Brand />
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {nav.map(([label, href, Icon], index) => {
            const active = pathname === href;

            return (
              <div key={href}>
                {index === 5 && <SectionLabel>Plan</SectionLabel>}
                {index === 9 && <SectionLabel>Tools</SectionLabel>}
                <Link
                  href={href}
                  className={`sw-nav-link mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? "sw-nav-active" : ""
                  }`}
                >
                  <Icon size={18} className={active ? "" : "opacity-80"} />
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: "var(--brand)" }}
                    />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
        <div
          className="border-t p-3"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-full font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--ai) 65%, var(--brand)))",
              }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm">{displayName}</b>
              <div className="truncate text-xs sw-muted">{displayEmail}</div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg transition hover:-translate-y-0.5 hover:bg-black/5 hover:text-[var(--danger)] dark:hover:bg-white/10"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header
        className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 md:px-7"
        style={{
          background: "color-mix(in srgb,var(--bg) 82%,transparent)",
          backdropFilter: "blur(16px)",
          borderColor: "var(--line)",
        }}
      >
        <button
          className="transition hover:text-[var(--brand)] md:hidden"
          onClick={() => setMobile(true)}
          aria-label="Open navigation"
        >
          <Menu />
        </button>
        <div className="md:hidden">
          <Brand compact />
        </div>
        <Link
          href="/transactions"
          className="ml-auto hidden w-64 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition hover:border-[var(--brand)] hover:shadow-sm md:flex"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <Search size={16} className="sw-muted" />
          <span className="sw-muted">Search transactions...</span>
          <kbd className="ml-auto text-xs sw-muted">⌘K</kbd>
        </Link>
        <button
          className="relative grid size-9 place-items-center rounded-xl border transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span
            className="absolute right-2 top-2 size-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="grid size-9 place-items-center rounded-xl border transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:text-[var(--brand)]"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          aria-label="Toggle theme"
        >
          <span className="dark:hidden">
            <Moon size={17} />
          </span>
          <span className="hidden dark:block">
            <Sun size={17} />
          </span>
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] p-4 pb-24 md:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="sw-enter">
            <h1 className="sw-gradient-text text-2xl font-bold tracking-tight md:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 sw-muted">{subtitle}</p>}
          </div>
          <form action="/auth/signout" method="post" className="md:hidden">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
        {children}
      </main>

      <button
        onClick={() => setQuick(true)}
        className="sw-fab fixed bottom-20 right-5 z-30 grid size-14 place-items-center rounded-full text-white shadow-lg md:bottom-7 md:right-7"
        style={{ background: "var(--brand)" }}
        aria-label="Quick add"
        title="Quick add"
      >
        <Plus />
      </button>

      <div
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t px-2 py-2 md:hidden"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        {(
          [
            ["Home", "/dashboard", LayoutDashboard],
            ["Money", "/transactions", ArrowLeftRight],
            ["", "#", Plus],
            ["AI", "/ai", Sparkles],
            ["More", "#more", Menu],
          ] as const
        ).map(([label, href, Icon], index) => (
          <Link
            key={index}
            href={href}
            onClick={
              index === 2
                ? (event) => {
                    event.preventDefault();
                    setQuick(true);
                  }
                : index === 4
                  ? (event) => {
                      event.preventDefault();
                      setMobile(true);
                    }
                  : undefined
            }
            className="flex flex-col items-center gap-1 text-[10px]"
            style={
              pathname === href
                ? { color: "var(--brand)" }
                : { color: "var(--muted)" }
            }
          >
            <span
              className={
                index === 2
                  ? "-mt-6 grid size-12 place-items-center rounded-full text-white"
                  : ""
              }
              style={index === 2 ? { background: "var(--brand)" } : undefined}
            >
              <Icon size={20} />
            </span>
            {label}
          </Link>
        ))}
      </div>

      {mobile && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMobile(false)}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            className="h-full w-[85%] max-w-xs overflow-y-auto p-3"
            style={{ background: "var(--panel)" }}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setMobile(false)} aria-label="Close">
                <X />
              </button>
            </div>
            {nav.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobile(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </aside>
        </div>
      )}

      {quick && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 md:place-items-center"
          onClick={() => setQuick(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="sw-card sw-pop w-full max-w-md overflow-hidden"
          >
            <div
              className="sw-hero p-5"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Quick Add</h2>
                  <p className="text-sm sw-muted">
                    What would you like to add?
                  </p>
                </div>
                <button onClick={() => setQuick(false)} aria-label="Close">
                  <X />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                ["Expense", "💸", "/transactions"],
                ["Income", "💵", "/transactions"],
                ["Transfer", "↔️", "/transactions"],
                ["Scan Receipt", "🧾", "/import"],
                ["Reports", "📄", "/reports"],
                ["Ask AI", "✨", "/ai"],
              ].map(([label, emoji, href]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setQuick(false)}
                  className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="mt-2 font-semibold">{label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest sw-muted">
      {children}
    </p>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex items-center gap-2"
          : "flex h-16 items-center gap-2.5 px-4"
      }
    >
      <div
        className="sw-glow grid size-9 place-items-center rounded-xl text-lg font-black text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--ai) 60%, var(--brand)))",
        }}
      >
        S
      </div>
      {!compact && (
        <div>
          <div className="font-bold">
            SpendWise <span style={{ color: "var(--ai)" }}>AI</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest sw-muted">
            Personal Finance
          </div>
        </div>
      )}
    </div>
  );
}
