// lib/api-client.ts
//
// The SOLE boundary between the frontend and the TWAI backend (FR-001, PRD 12.2).
// No other module may talk to the backend directly. No secrets live here — only
// the public NEXT_PUBLIC_API_BASE_URL (INV-012). The frontend never imports the
// Robinhood MCP, the Anthropic SDK, or any order-placement code.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Auth — bearer token injection.
// The getter is registered by <AuthTokenBridge> from the Neon Auth session, so
// this module imports no auth SDK and holds no secrets (INV-012): it only
// attaches a short-lived access token already present in the browser. The token
// authenticates the caller; the backend re-verifies it and enforces the
// email allowlist.
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
// Backtest (PRD Section 11.4 — API-030/031/032)
// ---------------------------------------------------------------------------

export type BacktestRunRequest = {
  strategy?: string;
  symbols?: string[];
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  initial_capital?: number;
  ml_model_id?: string | null;
};

export type BacktestMetrics = {
  num_trades: number;
  num_wins: number;
  num_losses: number;
  win_rate: number;
  profit_factor: number;
  gross_profit: number;
  gross_loss: number;
  net_pnl: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  avg_trade_return_pct: number;
  initial_capital: number;
  final_equity: number;
  num_days: number;
  start_date: string | null;
  end_date: string | null;
};

export type GateCheck = {
  value: number;
  op: string;
  threshold: number;
  passed: boolean;
};

export type BacktestGates = {
  passed: boolean;
  checks: Record<string, GateCheck>;
};

export type EquityPoint = { date: string; equity: number };

export type BacktestTrade = {
  symbol: string;
  entry_date: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  return_pct: number;
  exit_reason: string;
};

export type WalkForwardFold = {
  index: number;
  start_date: string;
  end_date: string;
  profit_factor: number;
  num_trades: number;
  net_pnl: number;
};

export type WalkForward = {
  n_folds: number;
  folds: WalkForwardFold[];
  oos_profit_factor: number;
};

export type BacktestReport = {
  id: string;
  created_at: string;
  status: string;
  params: BacktestRunRequest;
  metrics: BacktestMetrics;
  gates: BacktestGates;
  walk_forward: WalkForward;
  equity_curve: EquityPoint[];
  trades: BacktestTrade[];
};

export type BacktestRunResult = {
  id: string;
  metrics: BacktestMetrics;
  gates: BacktestGates;
};

export type BacktestSummary = {
  id: string;
  created_at: string;
  status: string;
  strategy: string;
  metrics: BacktestMetrics;
  gates_passed: boolean;
};

// Canonical default watchlist (PRD Section 3 strategy.default_symbols).
export const DEFAULT_SYMBOLS = ["AAPL", "NVDA", "MSFT", "SPY", "QQQ"];

// API-030
export function runBacktest(
  req: BacktestRunRequest,
): Promise<BacktestRunResult> {
  return apiFetch<BacktestRunResult>("/backtest/run", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// API-031
export function getBacktest(id: string): Promise<BacktestReport> {
  return apiFetch<BacktestReport>(`/backtest/${id}`);
}

// API-032
export function listBacktests(): Promise<BacktestSummary[]> {
  return apiFetch<BacktestSummary[]>("/backtest");
}

// ---------------------------------------------------------------------------
// ML models (PRD Section 11.5 — API-040/041/042/043)
// ---------------------------------------------------------------------------

export const MODEL_TYPES = ["xgboost", "logistic"] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

export type ModelTrainRequest = {
  model_type?: ModelType;
  symbols?: string[];
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  initial_capital?: number;
};

export type Phase1Gate = {
  metric: string;
  model: number;
  baseline: number;
  passed: boolean;
};

export type ClassifierMetrics = {
  n_train: number;
  n_test: number;
  train_positive_rate: number;
  test_positive_rate: number;
  decision_threshold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
};

export type BacktestSide = {
  profit_factor: number;
  net_pnl: number;
  num_trades: number;
  win_rate: number;
};

export type ModelMetrics = {
  classifier: ClassifierMetrics;
  feature_importances: Record<string, number>;
  backtest_oos: {
    window_start: string | null;
    window_end: string | null;
    model: BacktestSide;
    baseline: BacktestSide;
    gate: Phase1Gate;
  };
  phase1_gate: Phase1Gate;
};

// GET /models — slim row (API-041)
export type ModelSummary = {
  id: string;
  created_at: string;
  name: string;
  model_type: ModelType;
  status: "active" | "inactive";
  phase1_passed: boolean | null;
  model_pf: number | null;
  baseline_pf: number | null;
  roc_auc: number | null;
  num_trades: number | null;
};

// GET /models/{id} — full metadata (API-042)
export type ModelDetail = {
  id: string;
  created_at: string;
  name: string;
  model_type: ModelType;
  status: "active" | "inactive";
  params: Record<string, unknown>;
  metrics: ModelMetrics;
};

// POST /models/train result (API-040)
export type ModelTrainResult = {
  id: string;
  name: string;
  model_type: ModelType;
  metrics: ModelMetrics;
  phase1_gate: Phase1Gate;
};

// API-040
export function trainModel(req: ModelTrainRequest): Promise<ModelTrainResult> {
  return apiFetch<ModelTrainResult>("/models/train", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// API-041
export function listModels(): Promise<ModelSummary[]> {
  return apiFetch<ModelSummary[]>("/models");
}

// API-042
export function getModel(id: string): Promise<ModelDetail> {
  return apiFetch<ModelDetail>(`/models/${id}`);
}

// API-043
export function activateModel(id: string): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(`/models/${id}/activate`, {
    method: "PUT",
  });
}

// ---------------------------------------------------------------------------
// Robinhood connection (PRD Section 11.2 — API-010/011/012) + status.
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

// API-020 — Agentic account snapshot via MCP read tools. Shapes are
// broker-defined, so kept loose and rendered defensively.
export type Portfolio = {
  account: Record<string, unknown> | null;
  portfolio: Record<string, unknown> | null;
  positions: Array<Record<string, unknown>> | null;
};

// Full-page navigation target for the OAuth redirect (API-010). Not a fetch:
// /robinhood/connect 302-redirects to Robinhood, so the browser must navigate.
export function robinhoodConnectUrl(): string {
  return `${API_BASE_URL}/robinhood/connect`;
}

export function getRobinhoodStatus(): Promise<RobinhoodStatus> {
  return apiFetch<RobinhoodStatus>("/robinhood/status");
}

// API-012
export function disconnectRobinhood(): Promise<{ disconnected: boolean }> {
  return apiFetch<{ disconnected: boolean }>("/robinhood/disconnect", {
    method: "POST",
  });
}

// API-020
export function getPortfolio(): Promise<Portfolio> {
  return apiFetch<Portfolio>("/portfolio");
}

// Required disclosure (PRD Section 18) — shown before the first Robinhood
// connect and acknowledged before the connect button is enabled.
export const ROBINHOOD_DISCLOSURE =
  "This app uses quantitative models and an AI agent to day trade in your " +
  "Robinhood Agentic account. Backtest results do not guarantee live " +
  "performance. ML models can overfit and fail in live markets. The AI agent " +
  "may misinterpret signals, overtrade, or act on stale data. Day trading " +
  "involves significant risk, including possible loss of your entire funded " +
  "amount. You are solely responsible for all trades. Only fund your Agentic " +
  "account with money you can afford to lose. Robinhood does not supervise " +
  "this agent. Complete all validation phases before enabling auto-execution.";
