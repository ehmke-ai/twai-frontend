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
  exit_date: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  return_pct: number;
  exit_reason: string; // "stop" | "target" | "max_hold" | "end_of_backtest"
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

// ---------------------------------------------------------------------------
// Agent status (PRD Section 11.1 — API-001/002/003/004)
// ---------------------------------------------------------------------------

export type AgentStatus = {
  active: boolean;
  phase: number;
  last_cycle_at: string | null;
  heartbeat_at: string | null;
  poll_interval_sec: number;
  stopped_reason?: string | null;
};

// One decision-cycle record (PRD agent_decision; agent-feed row).
export type AgentDecision = {
  id: number;
  created_at: string;
  symbol: string;
  trigger: string;
  ml_score: number | null;
  action: "BUY" | "SELL" | "HOLD" | "PASS";
  reason: string;
  llm_model: string | null;
  phase: number;
  executed: boolean;
  blocked_by: string | null;
  perception: Record<string, unknown>;
  tokens: Record<string, unknown>;
};

// API-001 — returns the updated agent status.
export function startAgent(): Promise<AgentStatus> {
  return apiFetch<AgentStatus>("/agent/start", { method: "POST" });
}

// API-002 — returns the updated agent status.
export function stopAgent(): Promise<AgentStatus> {
  return apiFetch<AgentStatus>("/agent/stop", { method: "POST" });
}

// API-003
export function flattenAgent(): Promise<{
  flattening: boolean;
  positions_closed: number;
}> {
  return apiFetch<{ flattening: boolean; positions_closed: number }>(
    "/agent/flatten",
    { method: "POST" },
  );
}

// API-004
export function getAgentStatus(): Promise<AgentStatus> {
  return apiFetch<AgentStatus>("/agent/status");
}

// Recent decision-cycle log (agent-feed).
export function getAgentDecisions(limit = 50): Promise<AgentDecision[]> {
  return apiFetch<AgentDecision[]>(`/agent/decisions?limit=${limit}`);
}

// ---------------------------------------------------------------------------
// Execution: order ledger, P&L metrics, history, guardrail config (PRD M5).
// Order placement stays entirely backend-side via execution → mcp.robinhood
// (INV-001); the frontend only reads the ledger and routes user approvals.
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "approved"
  | "placed"
  | "filled"
  | "rejected"
  | "canceled";

// One row of the order ledger (PRD agent_order).
export type AgentOrder = {
  id: string;
  created_at: string | null;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  notional: number;
  price: number | null;
  status: OrderStatus;
  mcp_order_id: string | null;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  phase: number;
  trigger: string | null;
  reason: string;
  realized_pnl: number | null;
  raw: Record<string, unknown>;
};

// API-051 — realized P&L summary (PRD Section 15).
export type Metrics = {
  num_trades: number;
  num_wins: number;
  num_losses: number;
  win_rate: number;
  profit_factor: number;
  gross_profit: number;
  gross_loss: number;
  gross_pnl: number;
  slippage_cost: number;
  api_cost: number;
  net_pnl: number;
  api_cost_ratio: number | null;
  api_cost_alert: boolean;
  max_trades_per_week: number;
};

// API-050 — audit trail.
export type History = {
  orders: AgentOrder[];
  decisions: AgentDecision[];
};

// GET /agent/config — server-enforced guardrails (read-only).
export type GuardrailConfig = {
  max_trade_usd: number;
  max_pct_buying_power: number;
  max_open_positions: number;
  max_trades_per_week: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  min_hours_between_entries: number;
  hold_period_days_max: number;
  max_daily_loss_pct: number;
  max_decision_cycles_per_hour: number;
  perception_confidence_min: number;
  ml_guardrail_minimum: number;
};

// API-051
export function getMetrics(): Promise<Metrics> {
  return apiFetch<Metrics>("/metrics");
}

// API-050
export function getHistory(limit = 100): Promise<History> {
  return apiFetch<History>(`/history?limit=${limit}`);
}

export function getAgentOrders(status?: OrderStatus): Promise<AgentOrder[]> {
  const q = status ? `?status=${status}` : "";
  return apiFetch<AgentOrder[]>(`/agent/orders${q}`);
}

// Phase-3 approval — places the pending order via the backend (INV-014 opt-in).
export function approveOrder(
  id: string,
): Promise<{ order_id: string | null; executed: boolean; status: string; reason: string }> {
  return apiFetch(`/agent/orders/${id}/approve`, { method: "POST" });
}

export function rejectOrder(
  id: string,
): Promise<{ order_id: string | null; status: string }> {
  return apiFetch(`/agent/orders/${id}/reject`, { method: "POST" });
}

export function getAgentConfig(): Promise<GuardrailConfig> {
  return apiFetch<GuardrailConfig>("/agent/config");
}

// Required disclosure (PRD Section 18) — shown before the first Robinhood
// connect and acknowledged before the connect button is enabled.
export const ROBINHOOD_DISCLOSURE =
  "This app uses quantitative models and an AI agent to swing trade in your " +
  "Robinhood Agentic account. Positions may be held for days or weeks. " +
  "Backtest results do not guarantee live performance. ML models can overfit " +
  "and fail in live markets. The AI agent may misinterpret signals, overtrade, " +
  "or act on stale data. Swing trading involves significant risk, including " +
  "possible loss of your entire funded amount. You are solely responsible for " +
  "all trades. Only fund your Agentic account with money you can afford to " +
  "lose. Robinhood does not supervise this agent. Complete all validation " +
  "phases before enabling auto-execution.";
