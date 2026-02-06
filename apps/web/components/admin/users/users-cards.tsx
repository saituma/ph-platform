import { Badge } from "../../ui/badge";

type UserCard = {
  name: string;
  tier: string;
  status: string;
  onboarding: string;
  lastActive: string;
};

type UsersCardsProps = {
  users: UserCard[];
  onSelect: (name: string) => void;
};

export function UsersCards({ users, onSelect }: UsersCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {users.map((user) => (
        <button
          type="button"
          key={user.name}
          className="w-full rounded-2xl border border-border bg-secondary/40 p-4 text-left text-sm"
          onClick={() => onSelect(user.name)}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{user.name}</p>
            <Badge variant={user.tier === "Premium" ? "primary" : "default"}>
              {user.tier}
            </Badge>
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
        </button>
      ))}
    </div>
  );
}
