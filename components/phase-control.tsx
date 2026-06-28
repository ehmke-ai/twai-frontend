"use client";

import { useEffect, useState } from "react";

import { PhaseBadge } from "@/components/phase-badge";
import {
  ROBINHOOD_DISCLOSURE,
  getAgentStatus,
  setAgentPhase,
} from "@/lib/api-client";

const PHASES = [
  { n: 0, name: "Backtest" },
  { n: 1, name: "ML Train" },
  { n: 2, name: "Read-only" },
  { n: 3, name: "Review" },
  { n: 4, name: "Auto" },
];

// Validation-phase control (PRD Section 8.2 / FR-012). Auto-execution (Phase 4)
// is blocked until the user acknowledges the risk disclosure (INV-014 /
// Section 18). Lower phases only reduce capability, so they apply immediately.
export function PhaseControl() {
  const [phase, setPhase] = useState<number | null>(null);
  const [pending4, setPending4] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const s = await getAgentStatus();
        if (active) setPhase(s.phase);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function apply(target: number, acknowledged = false) {
    setBusy(true);
    setError(null);
    try {
      const s = await setAgentPhase(target, acknowledged);
      setPhase(s.phase);
      setPending4(false);
      setAck(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function select(target: number) {
    if (target === 4) {
      setPending4(true);
      return;
    }
    apply(target);
  }

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="flex items-center justify-between border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <div>
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Validation phase
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Server-enforced rollout. Auto-execution begins at Phase 4.
          </p>
        </div>
        {phase != null && <PhaseBadge phase={phase} />}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {PHASES.map((p) => (
            <button
              key={p.n}
              onClick={() => select(p.n)}
              disabled={busy || phase === p.n}
              className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                phase === p.n
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border border-black/[.1] hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.06]"
              }`}
            >
              {p.n} · {p.name}
            </button>
          ))}
        </div>

        {pending4 && (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Enable auto-execution (Phase 4)
            </div>
            <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
              {ROBINHOOD_DISCLOSURE}
            </p>
            <label className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                I understand and accept these risks and authorize the agent to
                place trades automatically after guardrails.
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => apply(4, true)}
                disabled={!ack || busy}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {busy ? "Enabling…" : "Enable Phase 4"}
              </button>
              <button
                onClick={() => {
                  setPending4(false);
                  setAck(false);
                }}
                disabled={busy}
                className="rounded-md border border-black/[.1] px-4 py-2 text-sm dark:border-white/[.18]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
