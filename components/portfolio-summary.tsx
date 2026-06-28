"use client";

import { useEffect, useState } from "react";

import { getPortfolio, type Portfolio } from "@/lib/api-client";

// Best-effort numeric read of a broker-defined field (shapes vary by account).
function num(obj: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function money(n: number | null): string {
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

// Agentic account totals via MCP read tools (API-020). Renders defensively
// because Robinhood's portfolio shape is broker-defined.
export function PortfolioSummary() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPortfolio()
      .then((p) => active && setPortfolio(p))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading portfolio…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-black/[.08] p-5 text-sm text-zinc-500 dark:border-white/[.145]">
        Portfolio unavailable: {error}
      </div>
    );
  }

  const p = portfolio?.portfolio ?? null;
  const equity = num(p, "equity", "total_equity", "market_value");
  const buyingPower = num(p, "buying_power", "buying_power_usd", "cash");
  const positions = portfolio?.positions?.length ?? 0;

  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <h2 className="mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
        Agentic account
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-zinc-500">Equity</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{money(equity)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Buying power</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{money(buyingPower)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Open positions</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{positions}</div>
        </div>
      </div>
    </div>
  );
}
