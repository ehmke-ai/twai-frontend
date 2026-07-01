"use client";

import { useEffect, useState } from "react";

import { DiscoveryPanel } from "@/components/discovery-panel";
import { MentionChart } from "@/components/mention-chart";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { getHealth, type HealthResponse } from "@/lib/api-client";

type Status = "loading" | "connected" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => {
        if (!active) return;
        setHealth(h);
        setStatus("connected");
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const dotColor =
    status === "connected"
      ? health?.db === "ok"
        ? "bg-green-500"
        : "bg-yellow-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-zinc-400";

  const statusLabel =
    status === "loading"
      ? "connecting…"
      : status === "connected"
        ? `backend ${health?.status} · db ${health?.db}`
        : "backend unreachable";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Stock mention tracker</p>
        </div>
        <span
          title={status === "error" && error ? error : statusLabel}
          className="inline-flex items-center gap-2 rounded-full border border-black/[.08] px-3 py-1 text-xs text-zinc-500 dark:border-white/[.145] dark:text-zinc-400"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          {statusLabel}
        </span>
      </header>

      <MentionChart symbol={selected} hero />
      <DiscoveryPanel selected={selected} onSelect={setSelected} />
      <WatchlistPanel collapsible defaultOpen={false} />
    </div>
  );
}
