"use client";

import { useEffect, useState } from "react";
import { listBacktests, type BacktestSummary } from "@/lib/api-client";

function fmt(n: number, digits = 2): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<BacktestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listBacktests()
      .then((r) => {
        if (!active) return;
        setRuns(r);
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
          Audit log of decisions, signals, and backtest runs.
        </p>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
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
      )}
    </div>
  );
}
