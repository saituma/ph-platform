"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";

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

type AdminNavProps = {
  items: NavItem[];
  currentPath: string;
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
  currentPath: string;
  collapsed?: boolean;
  nested?: boolean;
}) {
  const isActive =
    currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 items-center justify-between rounded-xl px-3 transition",
        nested && "ml-1 border-l-2 border-primary/15 pl-3",
        isActive
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
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
        <Badge variant="primary" className="shrink-0 text-[10px]">
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

type AdminNavGroupedProps = {
  groups: NavGroup[];
  currentPath: string;
  collapsed?: boolean;
};

function pathMatchesGroup(currentPath: string, items: NavItem[]): boolean {
  return items.some(
    (item) => currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href))
  );
}

export function AdminNavGrouped({ groups, currentPath, collapsed = false }: AdminNavGroupedProps) {
  /** Explicit expand/collapse; omitted key → fall back to “open if this group has the active route”. */
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

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
        return (
          <div key={group.id} className="rounded-xl border border-border/60 bg-card/40">
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
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                  {group.title}
                </span>
                {group.description ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {group.description}
                  </span>
                ) : null}
              </span>
            </button>
            {isOpen ? (
              <div className="space-y-0.5 px-2 py-2">
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
