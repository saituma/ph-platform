"use client";

import { AdminSidebar, AdminSidebarContent } from "./sidebar";
import { AdminTopbar } from "./topbar";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AdminSidebar collapsed={isSidebarCollapsed} />
        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <AdminSidebarContent currentPath={pathname} />
              </SheetContent>
            </Sheet>
            <div className="text-sm font-semibold text-foreground">PHP Admin</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
                LL
              </div>
            </div>
          </div>
          <div className="border-b border-border bg-card px-6 py-5 lg:hidden">
            {subtitle ? (
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {actions ? <div>{actions}</div> : null}
            </div>
          </div>
          <AdminTopbar
            title={title}
            subtitle={subtitle}
            actions={actions}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          />
          <main className="mx-auto w-full max-w-[1400px] space-y-8 px-6 py-8 lg:px-10">
            {children}
            <div className="pt-4 text-center text-xs text-muted-foreground">
              Made with care for Lift Lab. Powered by Client Reach AI.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
