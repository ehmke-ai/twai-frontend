"use client";

import { useEffect, useState } from "react";

import { getAgentConfig, type GuardrailConfig } from "@/lib/api-client";

// Server-enforced guardrails (PRD Section 9, GRD-001..014). These are configured
// in config.defaults.yaml — the single source of truth — and enforced server-side
// only (Section 17). Shown read-only here: the UI cannot weaken an invariant.
const ROWS: { key: keyof GuardrailConfig; label: string; fmt: (v: number) => string }[] = [
  { key: "max_trade_usd", label: "Max $ per trade (GRD-001)", fmt: (v) => `$${v}` },
  { key: "max_pct_buying_power", label: "Max % buying power (GRD-002)", fmt: (v) => `${v}%` },
  { key: "max_open_positions", label: "Max open positions (GRD-003)", fmt: (v) => `${v}` },
  { key: "max_trades_per_week", label: "Max trades / week (GRD-004)", fmt: (v) => `${v}` },
  { key: "max_daily_loss_pct", label: "Max daily loss → auto-Off (GRD-005)", fmt: (v) => `${v}%` },
  { key: "stop_loss_pct", label: "Stop-loss (GRD-006)", fmt: (v) => `${v}%` },
  { key: "take_profit_pct", label: "Take-profit target", fmt: (v) => `${v}%` },
  { key: "perception_confidence_min", label: "Min perception confidence (GRD-007)", fmt: (v) => `${v}` },
  { key: "min_hours_between_entries", label: "Min hours between entries (GRD-009)", fmt: (v) => `${v}h` },
  { key: "max_decision_cycles_per_hour", label: "Max decision cycles / hr (GRD-011)", fmt: (v) => `${v}` },
  { key: "ml_guardrail_minimum", label: "Min ML score (GRD-013)", fmt: (v) => `${v}` },
  { key: "hold_period_days_max", label: "Max hold period (GRD-014)", fmt: (v) => `${v}d` },
];

export function GuardrailsForm() {
  const [config, setConfig] = useState<GuardrailConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAgentConfig()
      .then((c) => active && setConfig(c))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Guardrails</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Enforced server-side before every order. Read-only — configured in
          config.defaults.yaml.
        </p>
      </div>
      {error && (
        <div className="px-5 py-4 text-sm text-zinc-500">Unavailable: {error}</div>
      )}
      {config && (
        <dl className="divide-y divide-black/[.06] dark:divide-white/[.08]">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <dt className="text-zinc-600 dark:text-zinc-300">{row.label}</dt>
              <dd className="font-mono tabular-nums text-zinc-500">
                {row.fmt(config[row.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
