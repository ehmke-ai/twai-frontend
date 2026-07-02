"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function DashboardShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "240px",
        } as React.CSSProperties
      }
    >
      <AppSidebar email={email} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
