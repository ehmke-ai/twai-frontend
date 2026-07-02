"use client";

import { useLayoutEffect } from "react";

import { fetchNeonAuthJwt, isJwt } from "@/lib/auth/api-token";
import { setAuthTokenGetter } from "@/lib/api-client";

type Props = {
  /** JWT minted server-side via auth.token() — used until the client refresh succeeds. */
  accessToken: string | null;
};

export function AuthTokenBridge({ accessToken }: Props) {
  useLayoutEffect(() => {
    const fallback = isJwt(accessToken) ? accessToken : null;

    setAuthTokenGetter(async () => {
      const fresh = await fetchNeonAuthJwt();
      return fresh ?? fallback;
    });

    return () => setAuthTokenGetter(null);
  }, [accessToken]);

  return null;
}
