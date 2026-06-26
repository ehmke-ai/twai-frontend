"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ROBINHOOD_DISCLOSURE,
  disconnectRobinhood,
  getPortfolio,
  getRobinhoodStatus,
  robinhoodConnectUrl,
  type Portfolio,
  type RobinhoodStatus,
} from "@/lib/api-client";

type Banner = { kind: "success" | "error"; text: string };

export default function IntegrationsPage() {
  const [status, setStatus] = useState<RobinhoodStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getRobinhoodStatus());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Surface the OAuth callback result (?connected=1 / ?error=…) then strip the
  // query so a refresh doesn't re-show the banner. setState lands in the async
  // callback (not synchronously in the effect body) to avoid cascading renders.
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const errorParam = params.get("error");
    const detail = params.get("detail");
    if (params.toString()) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    getRobinhoodStatus()
      .then((s) => {
        if (!active) return;
        setStatus(s);
        if (connected === "1") {
          setBanner({ kind: "success", text: "Robinhood account connected." });
        } else if (errorParam) {
          setBanner({
            kind: "error",
            text: `Connection failed: ${errorParam}${detail ? ` — ${detail}` : ""}`,
          });
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onDisconnect() {
    setWorking(true);
    try {
      await disconnectRobinhood();
      setBanner({ kind: "success", text: "Robinhood account disconnected." });
      setAcknowledged(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your Robinhood Agentic account. Phase 2 is read-only — the app
          can view your portfolio and quotes, but places no orders.
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {banner.text}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading connection status…</p>
      ) : status?.connected ? (
        <ConnectedCard status={status} working={working} onDisconnect={onDisconnect} />
      ) : (
        <ConnectCard
          configured={status?.configured ?? false}
          acknowledged={acknowledged}
          onAcknowledge={setAcknowledged}
        />
      )}
    </div>
  );
}

function ConnectCard({
  configured,
  acknowledged,
  onAcknowledge,
}: {
  configured: boolean;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div>
        <h2 className="font-medium">Robinhood Agentic</h2>
        <p className="text-sm text-zinc-500">Not connected</p>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="mb-2 font-semibold">Required disclosure</div>
        {ROBINHOOD_DISCLOSURE}
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          I understand and accept these risks, and I am solely responsible for
          all trades placed in my account.
        </span>
      </label>

      {!configured && (
        <p className="rounded-md border border-black/[.08] bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900">
          Backend OAuth is not configured. Set <code>ROBINHOOD_CLIENT_ID</code>{" "}
          (and related <code>ROBINHOOD_*</code> vars) on the backend to enable
          connecting.
        </p>
      )}

      {acknowledged && configured ? (
        <a
          href={robinhoodConnectUrl()}
          className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Connect Robinhood
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md bg-black px-4 py-2 text-sm font-medium text-white opacity-50 dark:bg-white dark:text-black"
        >
          Connect Robinhood
        </button>
      )}
    </div>
  );
}

function ConnectedCard({
  status,
  working,
  onDisconnect,
}: {
  status: RobinhoodStatus;
  working: boolean;
  onDisconnect: () => void;
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function onTestRead() {
    setTesting(true);
    setTestError(null);
    try {
      setPortfolio(await getPortfolio());
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Robinhood Agentic</h2>
          <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Connected (read-only)
          </p>
        </div>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={working}
          className="rounded-md border border-black/[.12] px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/[.2]"
        >
          {working ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Field label="Account" value={status.account_number ?? status.account_id ?? "—"} />
        <Field label="Type" value={status.account_type ?? "—"} />
        <Field label="Scope" value={status.scope ?? "—"} />
        <Field
          label="Token expires"
          value={status.expires_at ? new Date(status.expires_at).toLocaleString() : "—"}
        />
      </dl>

      <div className="space-y-3 border-t border-black/[.06] pt-4 dark:border-white/[.1]">
        <button
          type="button"
          onClick={onTestRead}
          disabled={testing}
          className="rounded-md border border-black/[.12] px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/[.2]"
        >
          {testing ? "Reading…" : "Test read access"}
        </button>
        {testError && <p className="text-sm text-red-600 dark:text-red-400">{testError}</p>}
        {portfolio && (
          <pre className="overflow-x-auto rounded-lg border border-black/[.06] bg-zinc-50 p-3 text-xs dark:border-white/[.1] dark:bg-zinc-900">
            {JSON.stringify(portfolio.portfolio, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[.06] p-3 dark:border-white/[.1]">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  );
}
