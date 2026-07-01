import type { Metadata } from "next";

import { NeonAuthProvider } from "@/components/neon-auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "TWAI — Perception Terminal",
  description: "Social sentiment research for the TWAI swing trading agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <NeonAuthProvider>{children}</NeonAuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
