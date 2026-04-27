"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AdminTopbar } from "./topbar";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Desktop topbar */}
        <AdminTopbar title={title} subtitle={subtitle} actions={actions} />

        {/* Mobile header */}
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <div className="flex min-w-0 flex-col">
            {subtitle && (
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-primary leading-none mb-0.5">
                {subtitle}
              </p>
            )}
            <h1 className="truncate text-base font-black tracking-tight text-foreground leading-none">
              {title}
            </h1>
          </div>
          {actions && <div className="ml-auto shrink-0">{actions}</div>}
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 px-3 py-5 sm:px-4 sm:py-6 lg:space-y-8 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
