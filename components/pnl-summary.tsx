"use client";

import { getMetrics } from "@/lib/api-client";
import { usePolling } from "@/lib/use-polling";

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

// Realized P&L summary (PRD Section 15 / API-051). Net P&L is gross minus
// estimated slippage and Anthropic API spend (FR-013).
export function PnlSummary() {
  // CFG-016 — relaxed swing cadence.
  const { data: metrics, error } = usePolling(getMetrics, 60_000);

  if (error) {
    return (
      <div className="rounded-xl border border-black/[.08] p-5 text-sm text-zinc-500 dark:border-white/[.145]">
        P&amp;L unavailable: {error}
      </div>
    );
  }
  if (!metrics) {
    return (
      <div className="rounded-xl border border-black/[.08] p-5 text-sm text-zinc-500 dark:border-white/[.145]">
        Loading P&amp;L…
      </div>
    );
  }

  const netTone =
    metrics.net_pnl > 0
      ? "text-green-600 dark:text-green-400"
      : metrics.net_pnl < 0
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Realized P&amp;L
        </h2>
        <span className="text-xs text-zinc-400">
          {metrics.num_trades} trade{metrics.num_trades === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Net P&L" value={money(metrics.net_pnl)} tone={netTone} />
        <Stat label="Gross P&L" value={money(metrics.gross_pnl)} />
        <Stat
          label="Profit factor"
          value={metrics.num_trades ? metrics.profit_factor.toFixed(2) : "—"}
        />
        <Stat
          label="Win rate"
          value={metrics.num_trades ? `${(metrics.win_rate * 100).toFixed(0)}%` : "—"}
        />
        <Stat label="API cost" value={money(metrics.api_cost)} />
        <Stat label="Slippage" value={money(metrics.slippage_cost)} />
        <Stat
          label="Cost ratio"
          value={
            metrics.api_cost_ratio != null
              ? `${(metrics.api_cost_ratio * 100).toFixed(0)}%`
              : "—"
          }
          tone={metrics.api_cost_alert ? "text-amber-600 dark:text-amber-400" : ""}
        />
        <Stat
          label="Wins / Losses"
          value={`${metrics.num_wins} / ${metrics.num_losses}`}
        />
      </div>
      {metrics.api_cost_alert && (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          AI cost exceeds 20% of gross P&amp;L (FR-013).
        </div>
      )}
    </div>
  );
}
