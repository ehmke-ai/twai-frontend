"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAgentStatus,
  startAgent,
  stopAgent,
  type AgentStatus,
} from "@/lib/api-client";

// PRD 8.1: default Off; poll status while mounted; ≤1 poll stop latency.
export function AgentToggle({
  onStatus,
}: {
  onStatus?: (status: AgentStatus) => void;
}) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const refresh = useCallback(async () => {
    try {
      const s = await getAgentStatus();
      setStatus(s);
      setError(null);
      onStatusRef.current?.(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    // Relaxed swing cadence (CFG-016, 60s) — fall back to 15s before first load.
    const intervalMs = (status?.poll_interval_sec ?? 15) * 1000;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, status?.poll_interval_sec]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const next = status?.active ? await stopAgent() : await startAgent();
      setStatus(next);
      onStatusRef.current?.(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const active = status?.active ?? false;
  const lastCycle = status?.last_cycle_at
    ? new Date(status.last_cycle_at).toLocaleTimeString()
    : null;

  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${
              active ? "bg-green-500" : "bg-zinc-400"
            }`}
          >
            {active && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            )}
          </span>
          <div>
            <div className="text-sm font-medium">
              {active ? "Agent Active" : "Agent Inactive"}
            </div>
            <div className="text-xs text-zinc-500">
              {active
                ? lastCycle
                  ? `last cycle ${lastCycle}`
                  : "running…"
                : "no trades will be placed"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Phase {status.phase}
            </span>
          )}
          <button
            onClick={toggle}
            disabled={busy}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              active
                ? "border border-black/[.1] hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.06]"
                : "bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            {busy ? "…" : active ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      {status?.stopped_reason && !active && (
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Auto-stopped: {status.stopped_reason}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
