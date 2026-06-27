"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/auth/sign-in");
      }}
      className={
        className ??
        "text-sm text-zinc-500 transition-colors hover:text-black dark:hover:text-white"
      }
    >
      Sign out
    </button>
  );
}
