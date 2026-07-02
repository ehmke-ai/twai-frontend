/** Helpers for the bearer JWT the backend verifies against Neon Auth JWKS. */

export function isJwt(value: string | null | undefined): value is string {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

type TokenResponse = {
  token?: string | null;
  data?: { token?: string | null };
};

function readJwt(payload: TokenResponse | null | undefined): string | null {
  const candidate = payload?.token ?? payload?.data?.token ?? null;
  return isJwt(candidate) ? candidate : null;
}

/** Exchange the session cookie for a signed JWT (not the opaque session token). */
export async function fetchNeonAuthJwt(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", { credentials: "include" });
    if (!res.ok) return null;

    const headerJwt = res.headers.get("set-auth-jwt");
    if (isJwt(headerJwt)) return headerJwt;

    const data = (await res.json()) as TokenResponse;
    return readJwt(data);
  } catch {
    return null;
  }
}
