"use client";

import { useEffect, useState } from "react";

import { AgentFeed } from "@/components/agent-feed";
import { AgentToggle } from "@/components/agent-toggle";
import { OrderApprovals } from "@/components/order-approvals";
import { PerceptionPanel } from "@/components/perception-panel";
import { PhaseBadge } from "@/components/phase-badge";
import { PnlSummary } from "@/components/pnl-summary";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { StopFlattenButton } from "@/components/stop-flatten-button";
import {
  getHealth,
  type AgentStatus,
  type HealthResponse,
} from "@/lib/api-client";

type Status = "loading" | "connected" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentStatus | null>(null);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TWAI</h1>
          <p className="mt-1 text-sm text-zinc-500">AI Swing Trading Agent</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {agent && <PhaseBadge phase={agent.phase} />}
          <StopFlattenButton />
        </div>
      </div>

      {/* Agent toggle sits above everything (PRD 8.1). */}
      <AgentToggle onStatus={setAgent} />

      {/* Phase-3 review queue (hides itself when empty). */}
      <OrderApprovals />

      <PnlSummary />
      <PortfolioSummary />
      <PerceptionPanel />

      <AgentFeed />

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
