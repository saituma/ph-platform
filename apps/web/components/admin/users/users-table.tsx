"use client";

import { useRouter } from "next/navigation";
import { Eye, BarChart3, Mail, MoreVertical } from "lucide-react";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Frame, FramePanel } from "../../ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

export type UserRow = {
  id: number;
  name: string;
  email?: string;
  isBlocked?: boolean;
  athleteType: "Youth" | "Adult";
  age?: number | null;
  team?: string | null;
  program?: string;
  status: "Active" | "Inactive" | "Trial" | "Blocked";
  joined?: string;
  lastActive: string;
  progress?: number;
  profilePicture?: string | null;
};

type UsersTableProps = {
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.Inactive}`}
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
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 rounded-full bg-zinc-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

function UserAvatar({
  name,
  profilePicture,
}: {
  name: string;
  profilePicture?: string | null;
}) {
  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
      {initials}
    </div>
  );
}

export function UsersTable({
  users,
  onSelect: _onSelect,
  onChangePlan: _onChangePlan,
  onToggleBlock: _onToggleBlock,
  onDelete: _onDelete,
}: UsersTableProps) {
  const router = useRouter();

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No users found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your filters or search term.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="hidden md:block">
      <Frame>
        <FramePanel className="overflow-hidden p-0">
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  User
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Age
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Team
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Program
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Joined
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Active
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Progress
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/users/${user.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/users/${user.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={user.name}
                        profilePicture={user.profilePicture}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.name}
                        </p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.age ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.team ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.program ?? "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {user.joined ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {user.lastActive}
                  </TableCell>
                  <TableCell>
                    <ProgressBar value={user.progress ?? 0} />
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="View"
                        onClick={() => router.push(`/users/${user.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Message"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="More"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </FramePanel>
      </Frame>
    </div>
  );
}
