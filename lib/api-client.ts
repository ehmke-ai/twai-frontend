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
