"use client";

import { useEffect, useState } from "react";

import { getPerception, type PerceptionSignal } from "@/lib/api-client";

// Color a sentiment score (-1..+1): green bullish, red bearish, zinc neutral.
function tone(score: number): string {
  if (score > 0.1) return "text-green-600 dark:text-green-400";
  if (score < -0.1) return "text-red-600 dark:text-red-400";
  return "text-zinc-500";
}

function score(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

// Latest PerceptionSignal per symbol (PRD FR-016 / INV-018): retail /
// institutional / media sentiment plus the Anthropic-written key thesis.
export function PerceptionPanel() {
  const [signals, setSignals] = useState<PerceptionSignal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPerception();
        if (active) {
          setSignals(data);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoaded(true);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Perception
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          What Anthropic reads for each symbol — retail / institutional / media.
        </p>
      </div>

      {error && <div className="px-5 py-3 text-sm text-red-600">{error}</div>}

      {loaded && signals.length === 0 && !error && (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          No perception signals yet. The sentiment monitor populates these on its
          cadence while the agent runs.
        </div>
      )}

      <ul className="divide-y divide-black/[.06] dark:divide-white/[.08]">
        {signals.map((s) => (
          <li key={s.symbol} className="px-5 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-14 font-medium">{s.symbol}</span>
              <span className={`tabular-nums ${tone(s.retail_sentiment)}`}>
                R {score(s.retail_sentiment)}
              </span>
              <span className={`tabular-nums ${tone(s.institutional_sentiment)}`}>
                I {score(s.institutional_sentiment)}
              </span>
              <span className={`tabular-nums ${tone(s.media_sentiment)}`}>
                M {score(s.media_sentiment)}
              </span>
              <span className="ml-auto text-xs text-zinc-400">
                conf {s.confidence.toFixed(2)}
                {s.persona_consensus ? " · consensus" : ""}
              </span>
            </div>
            {s.key_thesis && (
              <p className="mt-1 truncate text-zinc-500" title={s.key_thesis}>
                {s.key_thesis}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
