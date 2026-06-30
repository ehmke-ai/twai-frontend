"use client";

import { setAuthTokenGetter } from "@/lib/api-client";

// Mint the bearer JWT the api-client attaches to every backend call.
//
// `authClient.token()` was returning null intermittently — when it did, the
// request went out with no Authorization header and the backend answered 401
// "Missing bearer token". The Neon Auth handler's `/token` endpoint instead
// deterministically exchanges the httpOnly session cookie for a fresh JWT, so we
// call it directly. No secrets touch this module (INV-012): it only reads a
// browser-scoped session cookie and forwards the short-lived token the backend
// re-verifies.
setAuthTokenGetter(async () => {
  try {
    const res = await fetch("/api/auth/token", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string | null };
    return data?.token ?? null;
  } catch {
    return null;
  }
});

export function AuthTokenBridge() {
  return null;
}
