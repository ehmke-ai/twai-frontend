import { AccountView } from "@neondatabase/neon-js/auth/react";
import { accountViewPaths } from "@neondatabase/neon-js/auth/react/ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((pathname) => ({ pathname }));
}

export default async function AccountPage({
  params,
}: Readonly<{
  params: Promise<{ pathname: string }>;
}>) {
  const { pathname } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AccountView pathname={pathname} />
    </main>
  );
}
