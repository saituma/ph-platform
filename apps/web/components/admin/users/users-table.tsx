"use client";

import { useRouter } from "next/navigation";
import { Eye, MessageSquare, Ban, ShieldCheck, Trash2 } from "lucide-react";
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
  programTier?: string | null;
  status: "Active" | "Inactive" | "Trial" | "Blocked" | "Archived";
  joined?: string;
  joinedRaw?: string | null;
  lastActive: string;
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
    Archived: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.Inactive}`}
    >
      {status}
    </span>
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
        className="h-9 w-9 rounded-full object-cover"
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
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
      {initials}
    </div>
  );
}

export function UsersTable({
  users,
  onSelect: _onSelect,
  onChangePlan,
  onToggleBlock,
  onDelete,
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
          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                    User
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Age
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]">
                    Team
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]">
                    Program
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Joined
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Last Active
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[160px]">
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
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name}
                          </p>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        user.athleteType === "Youth"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                      }`}>
                        {user.athleteType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.age ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.team ?? "-"}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangePlan(user.id);
                        }}
                      >
                        {user.program ?? "-"}
                      </button>
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
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="View details"
                          onClick={() => router.push(`/users/${user.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Message"
                          onClick={() => router.push(`/messaging?userId=${user.id}`)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                            user.isBlocked
                              ? "text-emerald-400 hover:bg-emerald-500/10"
                              : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400"
                          }`}
                          title={user.isBlocked ? "Unblock" : "Block"}
                          onClick={() => onToggleBlock(user.id, !user.isBlocked)}
                        >
                          {user.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                          onClick={() => onDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </FramePanel>
      </Frame>
    </div>
  );
}
