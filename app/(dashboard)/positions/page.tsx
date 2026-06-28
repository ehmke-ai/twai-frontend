"use client";

import { useEffect, useState } from "react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { getPortfolio, type Portfolio } from "@/lib/api-client";

export default function PositionsPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPortfolio()
      .then((p) => {
        if (!active) return;
        setPortfolio(p);
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
        <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Open positions in your Robinhood Agentic account (Phase 2+).
        </p>
      </div>

      <PortfolioSummary />

      {loading && (
        <p className="text-sm text-zinc-500">Loading portfolio…</p>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {portfolio && !loading && (
        <div className="space-y-4">
          {portfolio.positions && portfolio.positions.length > 0 ? (
            <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
              <h2 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Open positions ({portfolio.positions.length})
              </h2>
              <ul className="space-y-2 text-sm">
                {portfolio.positions.map((pos, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md border border-black/[.06] p-3 dark:border-white/[.1]"
                  >
                    <span className="font-medium">
                      {String(pos.symbol ?? pos.instrument_id ?? `Position ${i + 1}`)}
                    </span>
                    <span className="text-zinc-500">
                      {pos.quantity != null ? `${pos.quantity} shares` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-black/[.08] p-8 text-center dark:border-white/[.145]">
              <p className="text-sm text-zinc-500">No open positions.</p>
              <p className="mt-1 text-xs text-zinc-400">
                Connect Robinhood and enable the agent to start swing trading.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
