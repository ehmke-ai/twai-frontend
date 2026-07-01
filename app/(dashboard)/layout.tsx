import { redirect } from "next/navigation";

import { AuthTokenBridge } from "@/components/auth-token-bridge";
import { DashboardShell } from "@/components/dashboard-shell";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const email = session.user.email ?? "";

  if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg border bg-muted font-mono text-sm font-bold">
              TW
            </div>
            <CardTitle>Not authorized</CardTitle>
            <CardDescription>
              {email || "This account"} is not on the TWAI allowlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutButton className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AuthTokenBridge />
      <DashboardShell email={email}>{children}</DashboardShell>
    </>
  );
}
