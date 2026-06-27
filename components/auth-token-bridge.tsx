"use client";

import { setAuthTokenGetter } from "@/lib/api-client";
import { authClient } from "@/lib/auth/client";

setAuthTokenGetter(async () => {
  const { data, error } = await authClient.token();
  if (error) return null;
  return data?.token ?? null;
});

export function AuthTokenBridge() {
  return null;
}
