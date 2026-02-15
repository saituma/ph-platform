import { Badge } from "../../ui/badge";

type UserCard = {
  id: number;
  name: string;
  email?: string;
  isBlocked?: boolean;
  tier: string;
  status: string;
  onboarding: string;
  lastActive: string;
};

type UsersCardsProps = {
  users: UserCard[];
  onSelect: (userId: number) => void;
  onToggleBlock: (userId: number, blocked: boolean) => void;
  onDelete: (userId: number) => void;
};

export function UsersCards({ users, onSelect, onToggleBlock, onDelete }: UsersCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {users.map((user) => (
        <div
          key={user.id}
          className="w-full rounded-2xl border border-border bg-secondary/40 p-4 text-left text-sm"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(user.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(user.id);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{user.name}</p>
            <Badge variant={user.tier === "Premium" ? "primary" : "default"}>
              {user.tier}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {user.isBlocked ? "Blocked" : "Active"}
            </span>
            {user.email ? (
              <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="text-foreground">{user.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Onboarding</span>
              <span className="text-foreground">{user.onboarding}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last Active</span>
              <span className="text-foreground">{user.lastActive}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary/70"
              onClick={(event) => {
                event.stopPropagation();
                onToggleBlock(user.id, !user.isBlocked);
              }}
            >
              {user.isBlocked ? "Unblock" : "Block"}
            </button>
            <button
              type="button"
              className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-500/10"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(user.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
