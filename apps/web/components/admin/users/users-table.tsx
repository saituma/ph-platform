import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

type UserRow = {
  id: number;
  name: string;
  email?: string;
  isBlocked?: boolean;
  tier: string;
  status: string;
  onboarding: string;
  lastActive: string;
};

type UsersTableProps = {
  users: UserRow[];
  onSelect: (userId: number) => void;
  onToggleBlock: (userId: number, blocked: boolean) => void;
  onDelete: (userId: number) => void;
};

export function UsersTable({ users, onSelect, onToggleBlock, onDelete }: UsersTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Onboarding</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="hover:bg-secondary/60"
              onClick={() => onSelect(user.id)}
            >
              <TableCell className="font-medium text-foreground">
                {user.name}
              </TableCell>
              <TableCell>
                <Badge variant={user.tier === "Premium" ? "primary" : "default"}>
                  {user.tier}
                </Badge>
              </TableCell>
              <TableCell>{user.status}</TableCell>
              <TableCell>{user.onboarding}</TableCell>
              <TableCell>{user.lastActive}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
