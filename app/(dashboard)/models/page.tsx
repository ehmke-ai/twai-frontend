"use client";

import { useCallback, useEffect, useState } from "react";

import { ModelTable } from "@/components/model-table";
import {
  DEFAULT_SYMBOLS,
  MODEL_TYPES,
  activateModel,
  listModels,
  trainModel,
  type ModelSummary,
  type ModelTrainResult,
  type ModelType,
} from "@/lib/api-client";

function fmt(n: number | null | undefined, digits = 2): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export default function ModelsPage() {
  const [modelType, setModelType] = useState<ModelType>("xgboost");
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS.join(", "));
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2025-06-01");
  const [capital, setCapital] = useState(5000);

  const [training, setTraining] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [lastTrained, setLastTrained] = useState<ModelTrainResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      setModels(await listModels());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Load the registry on mount (guarded against unmount; setState lands after
  // the fetch resolves, not synchronously in the effect body).
  useEffect(() => {
    let active = true;
    listModels()
      .then((m) => {
        if (active) setModels(m);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, []);

  async function onTrain(e: React.FormEvent) {
    e.preventDefault();
    setTraining(true);
    setError(null);
    try {
      const parsedSymbols = symbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const result = await trainModel({
        model_type: modelType,
        symbols: parsedSymbols,
        start_date: startDate,
        end_date: endDate,
        initial_capital: capital,
      });
      setLastTrained(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTraining(false);
    }
  }

  async function onActivate(id: string) {
    setActivatingId(id);
    setError(null);
    try {
      await activateModel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ML Models</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Phase 1 — train, validate, and activate models. The active model scores
          quotes for the worker. A model must beat the rule-only baseline on
          profit factor (OOS) to pass the Phase 1 gate.
        </p>
      </div>

      <form
        onSubmit={onTrain}
        className="grid gap-4 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145] sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">Model type</span>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value as ModelType)}
            className="rounded-md border border-black/[.1] bg-transparent px-3 py-2 dark:border-white/[.18]"
          >
            {MODEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
        <div className="flex items-end">
          <button
            type="submit"
            disabled={training}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {training ? "Training…" : "Train model"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {lastTrained && <TrainSummary result={lastTrained} />}

      <ModelTable
        models={models}
        activatingId={activatingId}
        onActivate={onActivate}
      />
    </div>
  );
}

function TrainSummary({ result }: { result: ModelTrainResult }) {
  const g = result.phase1_gate;
  const clf = result.metrics.classifier;
  const oos = result.metrics.backtest_oos;
  return (
    <div className="space-y-4 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{result.name}</span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            g.passed
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          Phase 1 gate: {g.passed ? "PASS" : "FAIL"}
        </span>
        <span className="text-sm text-zinc-500">
          model PF {fmt(g.model)} vs baseline {fmt(g.baseline)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="ROC-AUC" value={fmt(clf.roc_auc, 3)} />
        <Metric label="Precision" value={fmt(clf.precision, 3)} />
        <Metric label="Recall" value={fmt(clf.recall, 3)} />
        <Metric label="Train / test rows" value={`${clf.n_train} / ${clf.n_test}`} />
        <Metric label="OOS model trades" value={String(oos.model.num_trades)} />
        <Metric label="OOS model net P&L" value={`$${fmt(oos.model.net_pnl)}`} />
        <Metric label="OOS baseline trades" value={String(oos.baseline.num_trades)} />
        <Metric
          label="OOS window"
          value={`${oos.window_start ?? "—"} → ${oos.window_end ?? "—"}`}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[.06] p-3 dark:border-white/[.1]">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
