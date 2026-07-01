// lib/api-client.ts
//
// The SOLE boundary between the frontend and the TWAI backend (FR-001, PRD 12.2).
// No other module may talk to the backend directly. No secrets live here — only
// the public NEXT_PUBLIC_API_BASE_URL (INV-012).

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Auth — bearer token injection.
// The getter is registered by <AuthTokenBridge> from the Neon Auth session, so
// this module imports no auth SDK and holds no secrets (INV-012): it only
// attaches a short-lived access token already present in the browser. The
// backend re-verifies it and enforces the email allowlist.
// ---------------------------------------------------------------------------
type AuthTokenGetter = () => Promise<string | null>;
let getAuthToken: AuthTokenGetter | null = null;

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  getAuthToken = getter;
}

export type HealthResponse = {
  status: "ok" | "degraded";
  db: "ok" | "down";
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken ? await getAuthToken() : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// API-060
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

// ---------------------------------------------------------------------------
// Discovery — stock-mention tracker. Scan social sources (StockTwits + Reddit)
// for distinct-post mention counts per ticker, charted over time.
// ---------------------------------------------------------------------------

// One row of the ranking table: total mentions this scan + per-source split.
export type MentionTicker = {
  symbol: string;
  name: string;
  total: number;
  by_source: Record<string, number>;
  rank: number;
};

// One point on the per-ticker chart.
export type MentionPoint = {
  observed_at: string; // ISO timestamp
  total: number;
  by_source: Record<string, number>;
};

export type MentionRange = "1D" | "1W" | "1M" | "3M" | "all";

// GET /discovery — latest scan's ranking.
export function getDiscovery(): Promise<{ tickers: MentionTicker[] }> {
  return apiFetch<{ tickers: MentionTicker[] }>("/discovery");
}

// POST /discovery/scan — run a fresh scan now, return the new ranking.
export function scanDiscovery(): Promise<{ tickers: MentionTicker[] }> {
  return apiFetch<{ tickers: MentionTicker[] }>("/discovery/scan", {
    method: "POST",
  });
}

// GET /discovery/{symbol}/history — mention time-series for one ticker.
export function getMentionHistory(
  symbol: string,
  range: MentionRange = "1M",
): Promise<{ symbol: string; range: string; points: MentionPoint[] }> {
  return apiFetch(
    `/discovery/${encodeURIComponent(symbol)}/history?range=${range}`,
  );
}

// ---------------------------------------------------------------------------
// Watchlist — the curated set of tickers discovery scans for (the scan universe).
// Seeded with the top 100 US companies by market cap; user-managed (add/delete).
// Removing a ticker also purges its mention history (backend DELETE).
// ---------------------------------------------------------------------------

export type WatchlistEntry = { symbol: string; name: string };

export type WatchlistResponse = {
  symbols: string[];
  entries: WatchlistEntry[];
};

// GET /watchlist — current watchlist symbols (sorted).
export function getWatchlist(): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>("/watchlist");
}

// POST /watchlist — add a symbol; returns the updated list.
export function addToWatchlist(symbol: string): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>("/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

// DELETE /watchlist/{symbol} — remove a symbol (and purge its history).
export function removeFromWatchlist(
  symbol: string,
): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>(
    `/watchlist/${encodeURIComponent(symbol)}`,
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Robinhood — connection + read-only account viewing (no trading).
// OAuth and tokens live entirely backend-side (INV-011/INV-012); the frontend
// only triggers the redirect flow and reads non-sensitive connection state.
// ---------------------------------------------------------------------------

export type RobinhoodStatus = {
  connected: boolean;
  configured: boolean;
  account_id: string | null;
  account_number: string | null;
  account_type: string | null;
  scope: string | null;
  expires_at: string | null;
  connected_at: string | null;
};

// Agentic account snapshot via MCP read tools. Shapes are broker-defined, so
// kept loose and rendered defensively.
export type Portfolio = {
  account: Record<string, unknown> | null;
  portfolio: Record<string, unknown> | null;
  positions: Array<Record<string, unknown>> | null;
};

// Full-page navigation target for the OAuth redirect: /robinhood/connect
// 302-redirects to Robinhood, so the browser must navigate (not a fetch).
export function robinhoodConnectUrl(): string {
  return `${API_BASE_URL}/robinhood/connect`;
}

export function getRobinhoodStatus(): Promise<RobinhoodStatus> {
  return apiFetch<RobinhoodStatus>("/robinhood/status");
}

export function disconnectRobinhood(): Promise<{ disconnected: boolean }> {
  return apiFetch<{ disconnected: boolean }>("/robinhood/disconnect", {
    method: "POST",
  });
}

export function getPortfolio(): Promise<Portfolio> {
  return apiFetch<Portfolio>("/portfolio");
}

// Disclosure shown before the first Robinhood connect.
export const ROBINHOOD_DISCLOSURE =
  "This app connects to your Robinhood account for read-only viewing of your " +
  "balances and positions. It does not place trades. You can disconnect at any " +
  "time.";
