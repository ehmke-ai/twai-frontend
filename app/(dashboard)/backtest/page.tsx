"use client";

import { useState } from "react";

import { BacktestChart } from "@/components/backtest-chart";
import {
  DEFAULT_SYMBOLS,
  getBacktest,
  runBacktest,
  type BacktestReport,
  type GateCheck,
} from "@/lib/api-client";

const GATE_LABELS: Record<string, string> = {
  profit_factor: "Profit factor",
  max_drawdown_pct: "Max drawdown",
  min_trades: "Trade count",
  min_days: "Days covered",
  walk_forward_oos_pf: "Walk-forward OOS PF",
};

function fmt(n: number, digits = 2): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export default function BacktestPage() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS.join(", "));
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2026-01-01");
  const [capital, setCapital] = useState(5000);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<BacktestReport | null>(null);

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const parsedSymbols = symbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const { id } = await runBacktest({
        strategy: "perception_swing",
        symbols: parsedSymbols,
        start_date: startDate,
        end_date: endDate,
        initial_capital: capital,
      });
      // Fetch the full report (equity curve + trades) for display.
      setReport(await getBacktest(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setReport(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Phase 0 — historical validation of <code>perception_swing</code> (swing
          trading, positions held days–weeks). No live trading.
        </p>
      </div>

      <form
        onSubmit={onRun}
        className="grid gap-4 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145] sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-zinc-600 dark:text-zinc-300">Symbols</span>
          <input
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 dark:border-white/[.18]"
            placeholder="AAPL, NVDA, MSFT"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 dark:border-white/[.18]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 dark:border-white/[.18]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">
            Initial capital ($)
          </span>
          <input
            type="number"
            min={100}
            step={100}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 dark:border-white/[.18]"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={running}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {running ? "Running…" : "Run backtest"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {report && <Results report={report} />}
    </div>
  );
}

function Results({ report }: { report: BacktestReport }) {
  const m = report.metrics;
  const gates = report.gates;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            gates.passed
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          Phase 0 gates: {gates.passed ? "PASS" : "FAIL"}
        </span>
        <span className="text-sm text-zinc-500">{m.num_trades} trades</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Net P&L" value={`$${fmt(m.net_pnl)}`} positive={m.net_pnl >= 0} />
        <Metric label="Profit factor" value={fmt(m.profit_factor)} />
        <Metric label="Max drawdown" value={`${fmt(m.max_drawdown_pct)}%`} />
        <Metric label="Win rate" value={`${fmt(m.win_rate * 100, 1)}%`} />
        <Metric label="Total return" value={`${fmt(m.total_return_pct)}%`} positive={m.total_return_pct >= 0} />
        <Metric label="Final equity" value={`$${fmt(m.final_equity)}`} />
        <Metric label="Days" value={String(m.num_days)} />
        <Metric label="WF OOS PF" value={fmt(report.walk_forward.oos_profit_factor)} />
      </div>

      <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
        <h2 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Equity curve
        </h2>
        <BacktestChart
          points={report.equity_curve}
          initialCapital={m.initial_capital}
        />
      </div>

      <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
        <h2 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Phase 0 gates
        </h2>
        <ul className="space-y-2 text-sm">
          {Object.entries(gates.checks).map(([key, check]) => (
            <GateRow key={key} name={GATE_LABELS[key] ?? key} check={check} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/[.06] p-3 dark:border-white/[.1]">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold ${
          positive === undefined
            ? ""
            : positive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function GateRow({ name, check }: { name: string; check: GateCheck }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-zinc-600 dark:text-zinc-300">{name}</span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-zinc-500">
          {fmt(check.value)} {check.op} {fmt(check.threshold)}
        </span>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            check.passed ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </span>
    </li>
  );
}