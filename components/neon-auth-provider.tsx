"use client";

import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function NeonAuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      emailOTP
      authClient={authClient}
      navigate={(href) => router.push(href)}
      Link={Link}
      redirectTo="/"
    >
      {children}
    </NeonAuthUIProvider>
  );
}
