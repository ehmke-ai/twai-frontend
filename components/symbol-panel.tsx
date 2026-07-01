"use client";

import { useState } from "react";

import { MentionChart } from "@/components/mention-chart";
import { SentimentScatter } from "@/components/sentiment-scatter";
import type { ChartRange } from "@/lib/api-client";

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "all", label: "All" },
];

type Tab = "mentions" | "sentiment";

// The hero panel for the selected ticker: Mentions (volume over time) and
// Sentiment (per-post dots: bearish↔bullish × severity) share range toggles.
export function SymbolPanel({ symbol }: { symbol: string | null }) {
  const [tab, setTab] = useState<Tab>("mentions");
  const [range, setRange] = useState<ChartRange>("1M");

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[.08] px-5 py-3 dark:border-white/[.145]">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {symbol ?? "Select a ticker"}
          </h2>
          {symbol && (
            <div className="flex rounded-lg border border-black/[.08] p-0.5 dark:border-white/[.145]">
              {(
                [
                  ["mentions", "Mentions"],
                  ["sentiment", "Sentiment"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    tab === key
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
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
        <div className="px-5 py-24 text-center text-sm text-zinc-500">
          Select a ticker below to see its mention volume and sentiment.
        </div>
      ) : tab === "mentions" ? (
        <MentionChart symbol={symbol} range={range} hero />
      ) : (
        <SentimentScatter symbol={symbol} range={range} hero />
      )}
    </div>
  );
}
