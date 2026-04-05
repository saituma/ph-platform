"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Dot } from "lucide-react";

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export type NavItem = {
  label: string;
  href: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type NavGroup = {
  id: string;
  /** Short heading — maps to client sitemap areas */
  title: string;
  /** One-line context for coaches */
  description?: string;
  items: NavItem[];
};

function pathMatchesNavItem(pathOnly: string, href: string) {
  if (href === "/users") {
    return /^\/users\/?$/.test(pathOnly);
  }
  return pathOnly === href || (href !== "/" && pathOnly.startsWith(`${href}/`));
}

type AdminNavProps = {
  items: NavItem[];
  currentPath?: string | null;
  collapsed?: boolean;
};

/** Flat list (legacy / collapsed strip). */
export function AdminNav({ items, currentPath, collapsed = false }: AdminNavProps) {
  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label="Main">
      {items.map((item) => (
        <NavLinkRow key={item.href} item={item} currentPath={currentPath} collapsed={collapsed} />
      ))}
    </nav>
  );
}

function NavLinkRow({
  item,
  currentPath,
  collapsed,
  nested,
}: {
  item: NavItem;
  currentPath?: string | null;
  collapsed?: boolean;
  nested?: boolean;
}) {
  const normalizedPath = currentPath ?? "";
  const pathOnly = normalizedPath.split("?")[0] ?? normalizedPath;
  const isActive = pathMatchesNavItem(pathOnly, item.href);
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex h-10 items-center justify-between rounded-xl px-3 transition",
        nested && "ml-1 border-l-2 border-primary/15 pl-3",
        isActive
          ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent font-medium text-foreground ring-1 ring-primary/20"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {isActive ? <span className="absolute left-0 top-2 h-6 w-0.5 rounded-r bg-primary" /> : null}
      {collapsed && item.badge ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" aria-hidden />
      ) : null}
      <span className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
        {item.icon ? (
          <item.icon
            className={cn(
              "h-4 w-4 shrink-0",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-hidden
          />
        ) : null}
        {collapsed ? null : <span className="truncate">{item.label}</span>}
      </span>
      {!collapsed && item.badge ? (
        <Badge variant="primary" className="shrink-0 border border-primary/20 bg-primary/15 text-[10px] text-primary">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

type AdminNavGroupedProps = {
  groups: NavGroup[];
  currentPath?: string | null;
  collapsed?: boolean;
};

function pathMatchesGroup(currentPath: string | null | undefined, items: NavItem[]): boolean {
  const normalizedPath = currentPath ?? "";
  const pathOnly = normalizedPath.split("?")[0] ?? normalizedPath;
  return items.some((item) => pathMatchesNavItem(pathOnly, item.href));
}

export function AdminNavGrouped({ groups, currentPath, collapsed = false }: AdminNavGroupedProps) {
  /** Explicit expand/collapse; omitted key → fall back to “open if this group has the active route”. */
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});
  const groupActiveMap = useMemo(() => {
    const map = new Map<string, boolean>();
    groups.forEach((group) => {
      map.set(group.id, pathMatchesGroup(currentPath, group.items));
    });
    return map;
  }, [groups, currentPath]);

  const groupIsOpen = useCallback(
    (group: NavGroup) => {
      const activeHere = pathMatchesGroup(currentPath, group.items);
      if (Object.prototype.hasOwnProperty.call(openOverride, group.id)) {
        return openOverride[group.id];
      }
      return activeHere;
    },
    [currentPath, openOverride]
  );

  const toggle = useCallback((group: NavGroup) => {
    setOpenOverride((prev) => {
      const activeHere = pathMatchesGroup(currentPath, group.items);
      const current = Object.prototype.hasOwnProperty.call(prev, group.id) ? prev[group.id] : activeHere;
      return { ...prev, [group.id]: !current };
    });
  }, [currentPath]);

  if (collapsed) {
    const flat = groups.flatMap((g) => g.items);
    return (
      <nav className="flex flex-col gap-1 text-sm" aria-label="Main">
        {flat.map((item) => (
          <NavLinkRow key={item.href} item={item} currentPath={currentPath} collapsed />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-4 text-sm" aria-label="Main">
      {groups.map((group) => {
        const isOpen = groupIsOpen(group);
        const isActiveGroup = groupActiveMap.get(group.id) ?? false;
        return (
          <div
            key={group.id}
            className={cn(
              "rounded-xl border border-border/60 bg-card/40 backdrop-blur",
              isActiveGroup && "border-primary/30 bg-gradient-to-b from-primary/5 to-transparent",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(group)}
              className={cn(
                "flex w-full items-start gap-2 rounded-t-xl px-3 py-2.5 text-left transition hover:bg-secondary/50",
                isOpen && "border-b border-border/50 bg-secondary/25"
              )}
              aria-expanded={isOpen}
            >
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  !isOpen && "-rotate-90"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                  {isActiveGroup ? <Dot className="h-4 w-4 text-primary" /> : null}
                  {group.title}
                </span>
                {group.description ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {group.description}
                  </span>
                ) : null}
              </span>
              <span className="rounded-full border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {group.items.length}
              </span>
            </button>
            {isOpen ? (
              <div className="space-y-1 px-2 py-2">
                {group.items.map((item) => (
                  <NavLinkRow key={item.href} item={item} currentPath={currentPath} nested />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
