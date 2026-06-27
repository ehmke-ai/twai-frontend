import { AuthView } from "@neondatabase/neon-js/auth/react";
import { authViewPaths } from "@neondatabase/neon-js/auth/react/ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((pathname) => ({ pathname }));
}

export default async function AuthPage({
  params,
}: Readonly<{
  params: Promise<{ pathname: string }>;
}>) {
  const { pathname } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthView pathname={pathname} />
    </main>
  );
}
