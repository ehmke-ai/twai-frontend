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
