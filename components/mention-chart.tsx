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
  type ChartRange,
  type MentionPoint,
} from "@/lib/api-client";

const SOURCE_LABEL: Record<string, string> = {
  stocktwits: "StockTwits",
  reddit: "Reddit",
};

type Row = MentionPoint & { label: string };

function formatLabel(iso: string, range: ChartRange): string {
  const d = new Date(iso);
  // Intraday ranges show the time; longer ranges show the date.
  if (range === "1D" || range === "1W") {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
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
        Posts <span className="font-semibold">{row.total}</span>
      </div>
      {Object.entries(row.by_source).map(([source, count]) => (
        <div key={source} className="text-zinc-500 tabular-nums">
          {SOURCE_LABEL[source] ?? source}: {count}
        </div>
      ))}
    </div>
  );
}

type Props = {
  symbol: string;
  range: ChartRange;
  hero?: boolean;
};

// Mention volume over time for one ticker: distinct posts per hour/day bucket,
// derived from the stored corpus. Per-source split in the tooltip.
export function MentionChart({ symbol, range, hero = false }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoaded(false);
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

  if (error) {
    return <div className="px-5 py-3 text-sm text-red-600">{error}</div>;
  }
  if (loaded && rows.length === 0) {
    return (
      <div className={`px-5 text-center text-sm text-zinc-500 ${hero ? "py-24" : "py-12"}`}>
        No posts yet for {symbol}. History builds up as scans run.
      </div>
    );
  }

  return (
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
  );
}
