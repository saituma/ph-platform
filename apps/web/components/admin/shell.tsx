"use client";

import { AdminSidebar, AdminSidebarContent } from "./sidebar";
import { AdminTopbar } from "./topbar";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { DialogTitle } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
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
      <div className="flex min-h-screen min-w-0 overflow-x-hidden">
        <AdminSidebar collapsed={isSidebarCollapsed} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[86vw] max-w-[320px] border-r border-border bg-card p-0">
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                <ScrollArea className="h-full">
                  <div className="h-full px-4 py-6">
                    <AdminSidebarContent currentPath={pathname} />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src="/ph.jpg" alt="PH Performance" className="h-6 w-6 rounded-md object-cover" />
              <span className="text-sm font-bold tracking-tight text-foreground uppercase">Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
                LL
              </div>
            </div>
          </div>
          <div className="border-b border-border bg-card px-4 py-4 lg:hidden">
            {subtitle ? (
              <p className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <h1 className="min-w-0 truncate text-xl font-semibold text-foreground">{title}</h1>
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
          <main className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 px-3 py-5 sm:px-4 sm:py-6 lg:space-y-8 lg:px-8 lg:py-8 xl:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
