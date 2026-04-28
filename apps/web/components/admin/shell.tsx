"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AdminTopbar } from "./topbar";
import { GlobalCommandPalette } from "./global-command-palette";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Single command palette instance — always mounted, handles Cmd+K globally */}
        <GlobalCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

        {/* Desktop topbar */}
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Mobile header */}
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <div className="flex min-w-0 flex-1 flex-col">
            {subtitle && (
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-primary leading-none mb-0.5">
                {subtitle}
              </p>
            )}
            <h1 className="truncate text-base font-black tracking-tight text-foreground leading-none">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open search"
              className="flex h-8 w-8 items-center justify-center rounded-none border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            {actions}
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 px-3 py-5 sm:px-4 sm:py-6 lg:space-y-8 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
