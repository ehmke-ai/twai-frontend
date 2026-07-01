"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(className)}
      onClick={async () => {
        await authClient.signOut();
        router.push("/auth/sign-in");
      }}
    >
      Sign out
    </Button>
  );
}
