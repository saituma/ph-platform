"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { cn } from "../../../lib/utils";

export function UserDetailBackBar({ href = "/users" }: { href?: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5" asChild>
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>
    </Button>
  );
}

export function UserDetailSummaryStrip({
  userId,
  email,
  tierLabel,
  role,
  isBlocked,
  athleteName,
}: {
  userId: number;
  email?: string | null;
  tierLabel: string;
  role?: string | null;
  isBlocked?: boolean;
  athleteName?: string | null;
}) {
  const tierVariant =
    tierLabel === "Premium" ? "primary" : tierLabel === "Plus" ? "accent" : ("default" as const);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 shadow-sm dark:from-primary/12">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular-nums font-mono text-[11px]">
            #{userId}
          </Badge>
          <Badge variant={tierVariant}>{tierLabel}</Badge>
          <Badge
            variant="outline"
            className={cn(
              isBlocked
                ? "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
            )}
          >
            {isBlocked ? "Blocked" : "Active"}
          </Badge>
          {role ? (
            <Badge variant="outline" className="capitalize">
              {role}
            </Badge>
          ) : null}
        </div>
        <div className="min-w-0 text-sm text-muted-foreground lg:text-right">
          {email ? <span className="block truncate font-medium text-foreground">{email}</span> : null}
          {athleteName ? (
            <span className="mt-1 block">
              Linked athlete:{" "}
              <span className="font-semibold text-foreground">{athleteName}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function UserProfileSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/90 shadow-sm dark:shadow-black/15", className)}>
      <CardHeader className="border-b border-border/80 bg-gradient-to-r from-secondary/45 via-secondary/20 to-transparent py-5 dark:from-secondary/18">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription className="leading-relaxed">{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/70">{children}</div>
      </CardContent>
    </Card>
  );
}

export function ProfileField({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(140px,220px)_1fr] sm:items-baseline sm:gap-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium leading-relaxed text-foreground break-words">{value}</div>
    </div>
  );
}

export function UserDetailStatGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode; loading?: boolean }[];
}) {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/80 bg-secondary/25 px-4 py-3 dark:bg-secondary/15"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {item.loading ? <span className="text-sm font-normal text-muted-foreground">…</span> : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function UserDetailSectionCard({
  title,
  description,
  icon: Icon,
  children,
  variant = "default",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/90 shadow-sm dark:shadow-black/15",
        variant === "danger" && "border-red-500/20 dark:border-red-500/25"
      )}
    >
      <CardHeader
        className={cn(
          "border-b border-border/80 py-5",
          variant === "danger"
            ? "bg-gradient-to-r from-red-500/10 to-transparent"
            : "bg-gradient-to-r from-secondary/45 via-secondary/20 to-transparent dark:from-secondary/18"
        )}
      >
        <div className="flex items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                variant === "danger" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-primary/10 text-primary dark:bg-primary/20"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription className="leading-relaxed">{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
