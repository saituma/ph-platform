import Link from "next/link";

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

type NavItem = {
  label: string;
  href: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type ParentNavProps = {
  items: NavItem[];
  currentPath: string;
  collapsed?: boolean;
};

export function ParentNav({ items, currentPath, collapsed = false }: ParentNavProps) {
  return (
    <nav className="flex flex-col gap-2 text-sm">
      {items.map((item) => {
        const isActive =
          currentPath === item.href ||
          (item.href !== "/" && currentPath.startsWith(item.href));
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
              <Badge variant="primary">{item.badge}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
