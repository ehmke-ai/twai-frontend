// lib/api-client.ts
//
// The SOLE boundary between the frontend and the TWAI backend. No other module
// may talk to the backend directly. No secrets live here — only the public
// NEXT_PUBLIC_API_BASE_URL.

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  if (typeof window === "undefined") return fromEnv;

  const { hostname } = window.location;
  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (isLocal && !fromEnv.includes("localhost") && !fromEnv.includes("127.0.0.1")) {
    return "http://localhost:8000";
  }
  return fromEnv;
}

const API_BASE_URL = resolveApiBaseUrl();

// ---------------------------------------------------------------------------
// Auth — bearer token injection.
// The getter is registered by <AuthTokenBridge> from the Neon Auth session, so
// this module imports no auth SDK and holds no secrets: it only attaches a
// short-lived access token already present in the browser. The backend
// re-verifies it and enforces the email allowlist.
// ---------------------------------------------------------------------------
type AuthTokenGetter = () => Promise<string | null>;
let getAuthToken: AuthTokenGetter | null = null;

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  getAuthToken = getter;
}

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
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "Failed to fetch"
        ? `Cannot reach the backend at ${API_BASE_URL}. Is the API server running?`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new Error(message);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(
      res.status,
      `API ${path} failed: ${res.status} ${detail}`,
    );
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthResponse = {
  status: "ok" | "degraded";
  db: "ok" | "down";
};

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

// ---------------------------------------------------------------------------
// Discovery — everything is derived from the stored post corpus: the trending
// ranking (trailing window), per-ticker mention series, sentiment dots, and
// the post feed. Scans run on a schedule in the backend; "Scan now" just
// triggers one early.
// ---------------------------------------------------------------------------

// One row of the trending table.
export type MentionTicker = {
  symbol: string;
  name: string;
  total: number;
  by_source: Record<string, number>;
  rank: number;
};

// The most recent scan's outcome (per-source stats + status).
export type ScanInfo = {
  started_at: string;
  finished_at: string;
  trigger: "manual" | "scheduled";
  status: "ok" | "partial" | "failed";
  sources: Record<string, Record<string, unknown>>;
};

export type DiscoveryState = {
  tickers: MentionTicker[];
  window_hours: number;
  last_scan: ScanInfo | null;
};

// One point on the per-ticker mention chart (bucketed by hour/day).
export type MentionPoint = {
  observed_at: string; // ISO timestamp (bucket start)
  total: number;
  by_source: Record<string, number>;
};

// One labeled post as a dot: x = direction (bearish→bullish), y = severity.
export type SentimentDot = {
  post_id: number;
  observed_at: string;
  direction: number; // -1..1
  severity: number; // 0..1
  label: "bearish" | "neutral" | "bullish";
  source: string;
  url: string | null;
  snippet: string;
};

export type PostSentiment = {
  direction: number;
  severity: number;
  label: "bearish" | "neutral" | "bullish";
};

// One post in the per-symbol feed.
export type FeedPost = {
  post_id: number;
  source: string;
  text: string;
  created_at: string;
  author: string | null;
  url: string | null;
  score: number | null;
  sentiment: PostSentiment | null;
};

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "all";

// GET /discovery — trending ranking + last scan outcome.
export function getDiscovery(): Promise<DiscoveryState> {
  return apiFetch<DiscoveryState>("/discovery");
}

// POST /discovery/scan — run a scan now (collect + label), return new state.
export function scanDiscovery(): Promise<DiscoveryState> {
  return apiFetch<DiscoveryState>("/discovery/scan", { method: "POST" });
}

// GET /discovery/{symbol}/history — mention time-series for one ticker.
export function getMentionHistory(
  symbol: string,
  range: ChartRange = "1M",
): Promise<{ symbol: string; range: string; bucket: string; points: MentionPoint[] }> {
  return apiFetch(
    `/discovery/${encodeURIComponent(symbol)}/history?range=${range}`,
  );
}

// GET /discovery/{symbol}/sentiment — labeled posts as dots.
export function getSentiment(
  symbol: string,
  range: ChartRange = "1M",
): Promise<{ symbol: string; range: string; points: SentimentDot[] }> {
  return apiFetch(
    `/discovery/${encodeURIComponent(symbol)}/sentiment?range=${range}`,
  );
}

// GET /discovery/{symbol}/posts — recent posts (with sentiment) for the feed.
export function getPosts(
  symbol: string,
  limit = 50,
): Promise<{ symbol: string; posts: FeedPost[] }> {
  return apiFetch(
    `/discovery/${encodeURIComponent(symbol)}/posts?limit=${limit}`,
  );
}

// ---------------------------------------------------------------------------
// Watchlist — the curated set of tickers scans cover. Removing a ticker is a
// SOFT delete: scanning stops but collected history is kept.
// ---------------------------------------------------------------------------

export type WatchlistEntry = { symbol: string; name: string };

export type WatchlistResponse = {
  symbols: string[];
  entries: WatchlistEntry[];
};

export function getWatchlist(): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>("/watchlist");
}

export function addToWatchlist(symbol: string): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>("/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export function removeFromWatchlist(
  symbol: string,
): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>(
    `/watchlist/${encodeURIComponent(symbol)}`,
    { method: "DELETE" },
  );
}
