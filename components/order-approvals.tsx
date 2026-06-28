"use client";

import { useCallback, useEffect, useState } from "react";

import {
  approveOrder,
  getAgentOrders,
  rejectOrder,
  type AgentOrder,
} from "@/lib/api-client";

// Phase-3 review queue (PRD Section 8.2 / M5): orders the agent staged but that
// require explicit user approval before placement (INV-014). Empty in Phases 0–2
// and 4, so the card hides itself when there is nothing to review.
export function OrderApprovals() {
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((rows: AgentOrder[]) => {
    setOrders(rows);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const rows = await getAgentOrders("pending");
        if (active) apply(rows);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [apply]);

  async function act(id: string, kind: "approve" | "reject") {
    setBusy(id);
    setError(null);
    try {
      await (kind === "approve" ? approveOrder(id) : rejectOrder(id));
      apply(await getAgentOrders("pending"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (orders.length === 0 && !error) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-900/60">
      <div className="border-b border-amber-200 px-5 py-3 dark:border-amber-900/60">
        <h2 className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Orders awaiting approval ({orders.length})
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Phase 3 — review each order before it is placed.
        </p>
      </div>
      {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}
      <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span
              className={`font-semibold uppercase ${
                o.side === "buy" ? "text-green-600" : "text-red-600"
              }`}
            >
              {o.side}
            </span>
            <span className="font-medium">{o.symbol}</span>
            <span className="flex-1 text-zinc-500">
              {o.side === "buy" ? `$${o.notional.toFixed(2)}` : `${o.quantity} sh`}
              {o.reason ? ` · ${o.reason}` : ""}
            </span>
            <button
              onClick={() => act(o.id, "approve")}
              disabled={busy === o.id}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busy === o.id ? "…" : "Approve"}
            </button>
            <button
              onClick={() => act(o.id, "reject")}
              disabled={busy === o.id}
              className="rounded-md border border-black/[.1] px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/[.18]"
            >
              Reject
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
