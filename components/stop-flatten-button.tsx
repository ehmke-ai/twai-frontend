"use client";

import { useState } from "react";

import { flattenAgent } from "@/lib/api-client";

// Emergency "Stop & Flatten" (PRD API-003): stops the agent and closes all
// Agentic positions via MCP. Two-step confirm so it isn't fired by accident.
export function StopFlattenButton({ onDone }: { onDone?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function flatten() {
    setBusy(true);
    setError(null);
    try {
      const r = await flattenAgent();
      setResult(`Flattened — ${r.positions_closed} position(s) closed.`);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Close all positions?</span>
          <button
            onClick={flatten}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Flattening…" : "Confirm"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-md border border-black/[.1] px-3 py-1.5 text-sm dark:border-white/[.18]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setConfirming(true);
            setResult(null);
          }}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Stop &amp; Flatten
        </button>
      )}
      {result && <span className="text-xs text-zinc-500">{result}</span>}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
