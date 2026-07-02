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

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getSentiment,
  type ChartRange,
  type SentimentDot,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

const BULL = "oklch(0.646 0.222 41.116)";
const BEAR = "oklch(0.577 0.245 27.325)";
const NEUTRAL = "oklch(0.556 0 0)";
const AXIS_COLOR = "oklch(0.556 0 0)";
const GRID_COLOR = "oklch(0.922 0 0)";

const SOURCE_LABEL: Record<string, string> = {
  x: "X",
  stocktwits: "StockTwits",
  reddit: "Reddit",
};

function dotColor(direction: number): string {
  if (direction <= -0.15) return BEAR;
  if (direction >= 0.15) return BULL;
  return NEUTRAL;
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
    <div className="max-w-xs rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: dotColor(dot.direction) }}
        />
        <span className="font-medium capitalize">{dot.label}</span>
        <span className="text-muted-foreground">
          {SOURCE_LABEL[dot.source] ?? dot.source} · {when}
        </span>
      </div>
      <div className="mt-1 tabular-nums text-muted-foreground">
        direction {dot.direction.toFixed(2)} · severity {dot.severity.toFixed(2)}
      </div>
      <p className="mt-1.5 text-muted-foreground">{dot.snippet}</p>
    </div>
  );
}

function SentimentDotShape(props: { cx?: number; cy?: number; payload?: SentimentDot }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return <g />;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill={dotColor(payload.direction)}
      fillOpacity={0.72}
      stroke="none"
    />
  );
}

type Props = {
  symbol: string;
  range: ChartRange;
  hero?: boolean;
};

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
    return (
      <div className="px-6 py-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (loaded && dots.length === 0) {
    return (
      <div
        className={cn(
          "px-6 text-center text-sm text-muted-foreground",
          hero ? "py-24" : "py-12",
        )}
      >
        No labeled posts yet for {symbol}. Sentiment builds up as scans run.
      </div>
    );
  }

  return (
    <div className="px-2 py-4">
      <ResponsiveContainer width="100%" height={hero ? 340 : 260}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="direction"
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
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
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "severity",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: AXIS_COLOR },
            }}
          />
          <ReferenceLine x={0} stroke={AXIS_COLOR} strokeDasharray="4 4" strokeOpacity={0.6} />
          <Tooltip content={<DotTooltip />} cursor={false} />
          <Scatter data={dots} shape={<SentimentDotShape />} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
