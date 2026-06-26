// components/backtest-chart.tsx — dependency-free SVG equity curve (PRD M1).

import type { EquityPoint } from "@/lib/api-client";

type Props = {
  points: EquityPoint[];
  initialCapital: number;
};

export function BacktestChart({ points, initialCapital }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
        No equity data
      </div>
    );
  }

  const W = 720;
  const H = 240;
  const PAD = 28;

  const equities = points.map((p) => p.equity);
  const min = Math.min(...equities, initialCapital);
  const max = Math.max(...equities, initialCapital);
  const range = max - min || 1;

  const xAt = (i: number) =>
    PAD + (i / (points.length - 1 || 1)) * (W - 2 * PAD);
  const yAt = (v: number) => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.equity).toFixed(1)}`)
    .join(" ");

  const baselineY = yAt(initialCapital);
  const finalEquity = points[points.length - 1].equity;
  const up = finalEquity >= initialCapital;
  const stroke = up ? "#16a34a" : "#dc2626";

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Equity curve"
      >
        <line
          x1={PAD}
          x2={W - PAD}
          y1={baselineY}
          y2={baselineY}
          stroke="currentColor"
          className="text-zinc-300 dark:text-zinc-700"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-zinc-500">
        <span>{points[0].date}</span>
        <span>
          start ${initialCapital.toLocaleString()} → end $
          {finalEquity.toLocaleString()}
        </span>
        <span>{points[points.length - 1].date}</span>
      </figcaption>
    </figure>
  );
}