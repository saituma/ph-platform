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
  name: string;
  tier: string;
  status: string;
  onboarding: string;
  lastActive: string;
};

type UsersTableProps = {
  users: UserRow[];
  onSelect: (name: string) => void;
};

export function UsersTable({ users, onSelect }: UsersTableProps) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.name}
              className="hover:bg-secondary/60"
              onClick={() => onSelect(user.name)}
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
