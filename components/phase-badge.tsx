"use client";

// Validation-phase badge (PRD Section 8.2). Phases are server-enforced; this
// only renders the current one. Auto-execution begins at Phase 4 (INV-014).
const PHASES: Record<number, { name: string; tone: string }> = {
  0: { name: "Backtest", tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  1: { name: "ML Train", tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  2: { name: "Read-only", tone: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  3: { name: "Review", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  4: { name: "Auto", tone: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" },
};

export function PhaseBadge({ phase }: { phase: number }) {
  const meta = PHASES[phase] ?? {
    name: "Unknown",
    tone: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}
      title={`Phase ${phase} — ${meta.name}`}
    >
      Phase {phase} · {meta.name}
    </span>
  );
}
