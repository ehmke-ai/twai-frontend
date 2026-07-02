"use client";

import { useState } from "react";

import { MentionChart } from "@/components/mention-chart";
import { SentimentScatter } from "@/components/sentiment-scatter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ChartRange } from "@/lib/api-client";

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "all", label: "All" },
];

export function SymbolPanel({ symbol }: { symbol: string | null }) {
  const [tab, setTab] = useState<"mentions" | "sentiment">("mentions");
  const [range, setRange] = useState<ChartRange>("1M");

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 border-b">
        <div className="flex flex-wrap items-center gap-4">
          <CardTitle className={symbol ? "font-mono" : undefined}>
            {symbol ?? "Select a ticker"}
          </CardTitle>
          {symbol && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "mentions" | "sentiment")}>
              <TabsList>
                <TabsTrigger value="mentions">Mentions</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        {symbol && (
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as ChartRange)}
            variant="default"
            size="sm"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.key} value={r.key}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </CardHeader>

      {!symbol ? (
        <CardContent className="py-24 text-center text-sm text-muted-foreground">
          Select a ticker below to chart mention volume and sentiment.
        </CardContent>
      ) : tab === "mentions" ? (
        <CardContent className="px-0 pt-0">
          <MentionChart symbol={symbol} range={range} hero />
        </CardContent>
      ) : (
        <CardContent className="px-0 pt-0">
          <SentimentScatter symbol={symbol} range={range} hero />
        </CardContent>
      )}
    </Card>
  );
}
