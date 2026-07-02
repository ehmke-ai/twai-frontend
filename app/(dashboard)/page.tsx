"use client";

import { useEffect, useState } from "react";

import { DiscoveryPanel } from "@/components/discovery-panel";
import { PostFeed } from "@/components/post-feed";
import { SymbolPanel } from "@/components/symbol-panel";
import { WatchlistPanel } from "@/components/watchlist-panel";
import { Badge } from "@/components/ui/badge";
import { getHealth, type HealthResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";

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

  const dotClass =
    status === "connected"
      ? health?.db === "ok"
        ? "bg-sidebar-primary"
        : "bg-yellow-500"
      : status === "error"
        ? "bg-destructive"
        : "bg-muted-foreground";

  const statusLabel =
    status === "loading"
      ? "connecting…"
      : status === "connected"
        ? `backend ${health?.status} · db ${health?.db}`
        : "backend unreachable";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-end gap-4">
        <Badge variant="outline" title={status === "error" && error ? error : statusLabel}>
          <span className={cn("size-1.5 rounded-full", dotClass)} />
          {statusLabel}
        </Badge>
      </header>

      <SymbolPanel symbol={selected} />
      <PostFeed symbol={selected} />
      <DiscoveryPanel selected={selected} onSelect={setSelected} />
      <WatchlistPanel collapsible defaultOpen={false} />
    </div>
  );
}
