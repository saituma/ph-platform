"use client";

import Link from "next/link";
import type { UserRow } from "./users-table";

type UsersCardsProps = {
  users: UserRow[];
  onSelect: (userId: number) => void;
  onChangePlan: (userId: number) => void;
  onToggleBlock: (userId: number, blocked: boolean) => void;
  onDelete: (userId: number) => void;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
    Trial: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Blocked: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? styles.Inactive}`}
    >
      {status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-emerald-500"
      : value >= 50
        ? "bg-lime-500"
        : value >= 30
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

export function UsersCards({
  users,
  onChangePlan,
  onToggleBlock,
  onDelete,
}: UsersCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/users/${user.id}`}
          className="block w-full rounded-xl border border-border bg-card p-4 text-left text-sm transition-colors hover:bg-secondary/60"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
                {user.name
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{user.name}</p>
                {user.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
            <StatusBadge status={user.status} />
          </div>

          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Program</span>
              <span className="text-foreground">{user.program ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Age</span>
              <span className="text-foreground">{user.age ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Joined</span>
              <span className="text-foreground">{user.joined ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Active</span>
              <span className="text-foreground">{user.lastActive}</span>
            </div>
            <div>
              <span className="mb-1 block">Progress</span>
              <ProgressBar value={user.progress ?? 0} />
            </div>
          </div>

          <div
            className="mt-4 flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChangePlan(user.id);
              }}
            >
              Change Plan
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleBlock(user.id, !user.isBlocked);
              }}
            >
              {user.isBlocked ? "Unblock" : "Block"}
            </button>
            <button
              type="button"
              className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-500/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(user.id);
              }}
            >
              Delete
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
