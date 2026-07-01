"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getMentionHistory,
  type MentionPoint,
  type MentionRange,
} from "@/lib/api-client";

const RANGES: { key: MentionRange; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "all", label: "All" },
];

const SOURCE_LABEL: Record<string, string> = {
  stocktwits: "StockTwits",
  reddit: "Reddit",
};

type Row = MentionPoint & { label: string };

function formatLabel(iso: string, range: MentionRange): string {
  const d = new Date(iso);
  // Intraday ranges show the time; longer ranges show the date.
  if (range === "1D" || range === "1W") {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-black/[.1] bg-white px-3 py-2 text-xs shadow-sm dark:border-white/[.18] dark:bg-zinc-900">
      <div className="font-medium">{row.label}</div>
      <div className="mt-1 tabular-nums">
        Total <span className="font-semibold">{row.total}</span>
      </div>
      {Object.entries(row.by_source).map(([source, count]) => (
        <div key={source} className="text-zinc-500 tabular-nums">
          {SOURCE_LABEL[source] ?? source}: {count}
        </div>
      ))}
    </div>
  );
}

// Robinhood-style mention chart for the selected ticker: a single total-mentions
// line over time, with range toggles and a per-source breakdown in the tooltip.
// `hero` renders it taller and more prominent for use as the page's lead element.
export function MentionChart({
  symbol,
  hero = false,
}: {
  symbol: string | null;
  hero?: boolean;
}) {
  const [range, setRange] = useState<MentionRange>("1M");
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let active = true;
    getMentionHistory(symbol, range)
      .then((r) => {
        if (!active) return;
        setRows(r.points.map((p) => ({ ...p, label: formatLabel(p.observed_at, range) })));
        setError(null);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [symbol, range]);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="flex items-center justify-between gap-4 border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {symbol ? `${symbol} mentions` : "Mention history"}
        </h2>
        {symbol && (
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  range === r.key
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!symbol ? (
        <div
          className={`px-5 text-center text-sm text-zinc-500 ${hero ? "py-24" : "py-12"}`}
        >
          Select a ticker below to chart its mention history.
        </div>
      ) : error ? (
        <div className="px-5 py-3 text-sm text-red-600">{error}</div>
      ) : loaded && rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-zinc-500">
          No history yet for {symbol}. Mention history builds up as you scan over
          time.
        </div>
      ) : (
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={hero ? 340 : 260}>
            <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="mentionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-black/[.06] dark:text-white/[.08]"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#mentionFill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
