import Link from "next/link";

// Dashboard shell (PRD Section 12). Pages in the (dashboard) route group render
// inside this nav. More routes (models, positions, history, settings) land in
// later milestones.
const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/backtest", label: "Backtest" },
  { href: "/models", label: "Models" },
];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col">
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
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}