"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-secondary/20 to-transparent px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      {actionLabel && (
        <div className="mt-5">
          {actionHref ? (
            <Button variant="outline" render={<Link href={actionHref} />}>
              {actionLabel}
            </Button>
          ) : (
            <Button variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
