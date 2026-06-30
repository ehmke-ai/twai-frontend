"use client";

import { useEffect, useState } from "react";

import { DiscoveryPanel } from "@/components/discovery-panel";
import { MentionChart } from "@/components/mention-chart";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TWAI</h1>
        <p className="mt-1 text-sm text-zinc-500">Stock Mention Tracker</p>
      </div>

      <DiscoveryPanel selected={selected} onSelect={setSelected} />
      <MentionChart symbol={selected} />

      <div className="flex items-center gap-3 rounded-lg border border-black/[.06] p-4 text-sm dark:border-white/[.1]">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <span className="text-zinc-500">
          {status === "loading"
            ? "connecting to backend…"
            : status === "connected"
              ? `backend ${health?.status} · database ${health?.db}`
              : `backend unreachable: ${error}`}
        </span>
      </div>
    </div>
  );
}
