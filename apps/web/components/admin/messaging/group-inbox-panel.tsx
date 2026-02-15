import { Button } from "../../ui/button";

type GroupItem = {
  id: number;
  name: string;
};

type GroupInboxPanelProps = {
  groups: GroupItem[];
  selectedGroupId: number | null;
  users: any[];
  selectedMemberIds: number[];
  newGroupName: string;
  isCreatingGroup: boolean;
  onSelectGroup: (groupId: number) => void;
  onNewGroupNameChange: (value: string) => void;
  onToggleMember: (memberId: number) => void;
  onCreateGroup: () => Promise<void>;
};

export function GroupInboxPanel({
  groups,
  selectedGroupId,
  users,
  selectedMemberIds,
  newGroupName,
  isCreatingGroup,
  onSelectGroup,
  onNewGroupNameChange,
  onToggleMember,
  onCreateGroup,
}: GroupInboxPanelProps) {
  return (
    <div className="space-y-4 h-[calc(100%-3.5rem)] overflow-y-auto pr-1">
      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
        <p className="text-sm font-semibold text-foreground">Create group chat</p>
        <p className="text-xs text-muted-foreground">Add guardians/athletes to a shared conversation.</p>
        <div className="mt-3 grid gap-3">
          <input
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            placeholder="Group name"
            value={newGroupName}
            onChange={(event) => onNewGroupNameChange(event.target.value)}
          />
          <div className="grid gap-2">
            {users
              .filter((user: any) => user.role !== "admin")
              .map((user: any) => (
                <label key={user.id} className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(user.id)}
                    onChange={() => onToggleMember(user.id)}
                  />
                  {user.name || user.email}
                </label>
              ))}
          </div>
          <Button onClick={onCreateGroup} disabled={isCreatingGroup}>
            {isCreatingGroup ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelectGroup(group.id)}
            className={`flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm transition ${
              selectedGroupId === group.id ? "bg-background" : "bg-secondary/40 hover:border-primary/40"
            }`}
          >
            <div>
              <p className="font-semibold text-foreground">{group.name}</p>
              <p className="text-xs text-muted-foreground">Group chat</p>
            </div>
          </button>
        ))}

        {!groups.length ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            No groups yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
