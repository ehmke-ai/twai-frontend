"use client";

import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "@/lib/api-client";

type Status = "loading" | "connected" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          TWAI
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          AI Day Trading Agent — M0 scaffold
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-black/[.06] p-4 dark:border-white/[.1]">
          <span className={`inline-block h-3 w-3 rounded-full ${dotColor}`} />
          <div className="text-sm">
            <div className="font-medium text-black dark:text-zinc-50">
              Backend{" "}
              {status === "loading"
                ? "connecting…"
                : status === "connected"
                  ? `connected (${health?.status})`
                  : "unreachable"}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              {status === "connected"
                ? `database: ${health?.db}`
                : status === "error"
                  ? error
                  : "calling /health via lib/api-client.ts"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
