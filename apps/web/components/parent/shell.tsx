"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParentSidebar, ParentSidebarContent } from "./sidebar";
import { ParentTopbar } from "./topbar";
import { usePathname } from "next/navigation";

type ParentShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function ParentShell({ title, subtitle, actions, children }: ParentShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <ParentSidebar collapsed={collapsed} />

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-card border-r border-border py-8 px-6 lg:hidden">
            <ParentSidebarContent currentPath={pathname} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <ParentTopbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          isSidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
        />

        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-1"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <Menu className="h-4 w-4" />
          </Button>
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

        <main className="mx-auto w-full min-w-0 max-w-[1300px] space-y-6 px-3 py-5 sm:px-4 sm:py-6 lg:space-y-8 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
