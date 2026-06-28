"use client";

import { useEffect, useState } from "react";

import { PnlSummary } from "@/components/pnl-summary";
import {
  getHistory,
  listBacktests,
  type AgentOrder,
  type BacktestSummary,
} from "@/lib/api-client";

function fmt(n: number, digits = 2): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

const STATUS_TONE: Record<string, string> = {
  filled: "bg-green-500",
  placed: "bg-blue-500",
  approved: "bg-blue-400",
  pending: "bg-amber-500",
  rejected: "bg-red-500",
  canceled: "bg-zinc-400",
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [runs, setRuns] = useState<BacktestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getHistory(), listBacktests()])
      .then(([history, backtests]) => {
        if (!active) return;
        setOrders(history.orders);
        setRuns(backtests);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Audit log of orders, decisions, and backtest runs.
        </p>
      </div>

      <PnlSummary />

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
            <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
              <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Order ledger
              </h2>
            </div>
            {orders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-zinc-500">
                No orders yet. The agent records orders here once it trades
                (Phase 3+).
              </div>
            ) : (
              <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span
                      className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                        STATUS_TONE[o.status] ?? "bg-zinc-400"
                      }`}
                    />
                    <span
                      className={`font-semibold uppercase ${
                        o.side === "buy" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {o.side}
                    </span>
                    <span className="font-medium">{o.symbol}</span>
                    <span className="flex-1 text-zinc-500">
                      {o.price != null ? `${o.quantity} @ $${fmt(o.price)}` : `$${fmt(o.notional)}`}
                      {o.realized_pnl != null ? ` · P&L $${fmt(o.realized_pnl)}` : ""}
                    </span>
                    <span className="text-xs text-zinc-400">{o.status}</span>
                    <span className="text-xs text-zinc-400">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
            <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
              <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Backtest runs
              </h2>
            </div>
            {runs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-zinc-500">
                No backtest runs yet. Run a backtest from the{" "}
                <a href="/backtest" className="underline">Backtest</a> page.
              </div>
            ) : (
              <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
                {runs.map((run) => (
                  <li key={run.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span
                      className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                        run.gates_passed ? "bg-green-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="flex-1 font-mono text-xs text-zinc-500">
                      {run.id.slice(0, 8)}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-300">
                      {run.strategy}
                    </span>
                    <span className="text-zinc-500">
                      PF {fmt(run.metrics.profit_factor)} · {run.metrics.num_trades} trades
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(run.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
