// lib/api-client.ts
//
// The SOLE boundary between the frontend and the TWAI backend (FR-001, PRD 12.2).
// No other module may talk to the backend directly. No secrets live here — only
// the public NEXT_PUBLIC_API_BASE_URL (INV-012). The frontend never imports the
// Robinhood MCP, the Anthropic SDK, or any order-placement code.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
