"use client";

import { useEffect, useState } from "react";

import { getAgentDecisions, type AgentDecision } from "@/lib/api-client";

const ACTION_STYLES: Record<AgentDecision["action"], string> = {
  BUY: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  SELL: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  HOLD: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PASS: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

// Renders the recent decision-cycle log (PRD M4 — "all decisions logged").
export function AgentFeed({ pollMs = 30000 }: { pollMs?: number }) {
  const [rows, setRows] = useState<AgentDecision[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getAgentDecisions(50);
        if (active) {
          setRows(data);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoaded(true);
      }
    }
    load();
    const id = setInterval(load, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Agent feed
        </h2>
      </div>

      {error && (
        <div className="px-5 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loaded && rows.length === 0 && !error && (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No decisions yet. Start the agent to begin the live loop.
        </div>
      )}

      <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
        {rows.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[d.action]}`}
            >
              {d.action}
            </span>
            <span className="font-medium">{d.symbol}</span>
            <span className="flex-1 truncate text-zinc-500" title={d.reason}>
              {d.reason}
            </span>
            {d.ml_score != null && (
              <span className="tabular-nums text-xs text-zinc-400">
                ml {d.ml_score.toFixed(2)}
              </span>
            )}
            {d.blocked_by && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                blocked
              </span>
            )}
            <span className="text-xs text-zinc-400">
              {new Date(d.created_at).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
