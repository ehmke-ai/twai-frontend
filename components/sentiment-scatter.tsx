"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getSentiment,
  type ChartRange,
  type SentimentDot,
} from "@/lib/api-client";

const SOURCE_LABEL: Record<string, string> = {
  stocktwits: "StockTwits",
  reddit: "Reddit",
};

// Bearish→bullish color ramp for the dots (red → zinc → green).
function dotColor(direction: number): string {
  if (direction <= -0.15) return "#dc2626";
  if (direction >= 0.15) return "#16a34a";
  return "#a1a1aa";
}

function DotTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SentimentDot }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const dot = payload[0].payload;
  const when = new Date(dot.observed_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="max-w-xs rounded-lg border border-black/[.1] bg-white px-3 py-2 text-xs shadow-sm dark:border-white/[.18] dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor(dot.direction) }}
        />
        <span className="font-medium capitalize">{dot.label}</span>
        <span className="text-zinc-400">
          {SOURCE_LABEL[dot.source] ?? dot.source} · {when}
        </span>
      </div>
      <div className="mt-1 tabular-nums text-zinc-500">
        direction {dot.direction.toFixed(2)} · severity {dot.severity.toFixed(2)}
      </div>
      <p className="mt-1 text-zinc-600 dark:text-zinc-300">{dot.snippet}</p>
    </div>
  );
}

// A colored dot per labeled post; recharts calls this with the dot's props.
function SentimentDotShape(props: { cx?: number; cy?: number; payload?: SentimentDot }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={dotColor(payload.direction)}
      fillOpacity={0.65}
      stroke="none"
    />
  );
}

type Props = {
  symbol: string;
  range: ChartRange;
  hero?: boolean;
};

// The ideas.md chart: every labeled post is a dot. Left↔right is bearish↔
// bullish (direction), up↕down is severity. A glance shows where perception
// mass sits and how strongly it's held.
export function SentimentScatter({ symbol, range, hero = false }: Props) {
  const [dots, setDots] = useState<SentimentDot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    getSentiment(symbol, range)
      .then((r) => {
        if (!active) return;
        setDots(r.points);
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
  if (loaded && dots.length === 0) {
    return (
      <div className={`px-5 text-center text-sm text-zinc-500 ${hero ? "py-24" : "py-12"}`}>
        No labeled posts yet for {symbol}. Sentiment builds up as scans run.
      </div>
    );
  }

  return (
    <div className="px-2 py-4">
      <ResponsiveContainer width="100%" height={hero ? 340 : 260}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-black/[.06] dark:text-white/[.08]"
          />
          <XAxis
            type="number"
            dataKey="direction"
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v === -1 ? "bearish" : v === 1 ? "bullish" : v === 0 ? "0" : String(v)
            }
          />
          <YAxis
            type="number"
            dataKey="severity"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            width={44}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "severity",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#a1a1aa" },
            }}
          />
          <ReferenceLine x={0} stroke="#a1a1aa" strokeDasharray="4 4" />
          <Tooltip content={<DotTooltip />} cursor={false} />
          <Scatter data={dots} shape={<SentimentDotShape />} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
