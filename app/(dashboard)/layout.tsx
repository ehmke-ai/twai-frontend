import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthTokenBridge } from "@/components/auth-token-bridge";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/backtest", label: "Backtest" },
  { href: "/models", label: "Models" },
  { href: "/positions", label: "Positions" },
  { href: "/history", label: "History" },
  { href: "/settings/integrations", label: "Settings" },
];

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const email = session.user.email ?? "";

  if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-8 text-center shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
            Not authorized
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {email || "This account"} is not on the TWAI allowlist.
          </p>
          <div className="mt-6">
            <SignOutButton className="rounded-md border border-black/[.1] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <AuthTokenBridge />
      <header className="border-b border-black/[.08] dark:border-white/[.145]">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <span className="font-semibold tracking-tight">TWAI</span>
          <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-black dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="hidden sm:inline">{email}</span>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
