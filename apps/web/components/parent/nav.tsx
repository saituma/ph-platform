import Link from "next/link";

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
  label?: string;
  items: NavItem[];
};

type ParentNavProps = {
  groups: NavGroup[];
  currentPath: string;
  collapsed?: boolean;
};

export function ParentNav({ groups, currentPath, collapsed = false }: ParentNavProps) {
  return (
    <nav className="flex flex-col gap-5 text-sm">
      {groups.map((group, gi) => (
        <div key={group.id} className="flex flex-col gap-1">
          {!collapsed && group.label ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
              {group.label}
            </p>
          ) : gi > 0 && collapsed ? (
            <div className="mx-auto my-1 h-px w-6 bg-border/60" />
          ) : null}
          {group.items.map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== "/parent" && currentPath.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center justify-between rounded-2xl px-4 transition",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <span className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                  {item.icon ? (
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                  {collapsed ? null : item.label}
                </span>
                {!collapsed && item.badge ? (
                  <Badge variant="default">{item.badge}</Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
