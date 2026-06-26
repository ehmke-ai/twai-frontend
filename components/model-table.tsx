// components/model-table.tsx — trained-model registry table (PRD M2 / API-041,043).
//
// Presentational: the page owns fetching and the activate handler. One row per
// model; the active model carries a badge, others expose an "Activate" action
// (API-043). A new model is never auto-active (INV-014) — activation is explicit.

import type { ModelSummary } from "@/lib/api-client";

function fmt(n: number | null | undefined, digits = 2): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";
}

type Props = {
  models: ModelSummary[];
  activatingId: string | null;
  onActivate: (id: string) => void;
};

export function ModelTable({ models, activatingId, onActivate }: Props) {
  if (models.length === 0) {
    return (
      <div className="rounded-xl border border-black/[.08] p-8 text-center text-sm text-zinc-500 dark:border-white/[.145]">
        No models yet. Train one above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <table className="w-full text-sm">
        <thead className="border-b border-black/[.08] text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.145]">
          <tr>
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Phase 1</th>
            <th className="px-4 py-3 font-medium text-right">PF (model / base)</th>
            <th className="px-4 py-3 font-medium text-right">ROC-AUC</th>
            <th className="px-4 py-3 font-medium text-right">OOS trades</th>
            <th className="px-4 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr
              key={m.id}
              className="border-b border-black/[.04] last:border-0 dark:border-white/[.06]"
            >
              <td className="px-4 py-3">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums">{m.model_type}</td>
              <td className="px-4 py-3">
                <GateBadge passed={m.phase1_passed} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {fmt(m.model_pf)} / {fmt(m.baseline_pf)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(m.roc_auc, 3)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {m.num_trades ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {m.status === "active" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => onActivate(m.id)}
                    disabled={activatingId !== null}
                    className="rounded-md border border-black/[.12] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.2] dark:hover:bg-white/[.06]"
                  >
                    {activatingId === m.id ? "Activating…" : "Activate"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GateBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) return <span className="text-zinc-500">—</span>;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        passed
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  );
}
