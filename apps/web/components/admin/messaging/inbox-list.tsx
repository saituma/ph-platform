import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { EmptyState } from "../empty-state";
import { cn } from "../../../lib/utils";

type Thread = {
  userId: number;
  name: string;
  displayName?: string;
  preview: string;
  time: string;
  priority: boolean;
  premium: boolean;
  unread?: number;
  pinned?: boolean;
  role?: string;
  hasAthlete?: boolean;
  online?: boolean;
  typing?: boolean;
};

type InboxListProps = {
  threads: Thread[];
  selected?: number | null;
  onSelect: (userId: number) => void;
  onFilterSelect: (chip: string) => void;
  searchValue: string;
  onSearch: (value: string) => void;
  activeFilter: string;
  counts?: Record<string, number>;
};

export function InboxList({
  threads,
  selected,
  onSelect,
  onFilterSelect,
  searchValue,
  onSearch,
  activeFilter,
  counts,
}: InboxListProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["All", "Guardian", "Athlete", "Unread", "Premium"].map((chip) => (
          <Button
            key={chip}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => onFilterSelect(chip)}
          >
            {counts?.[chip] ? `${chip} (${counts[chip]})` : chip}
          </Button>
        ))}
      </div>
      <Input
        placeholder="Search conversations"
        value={searchValue}
        onChange={(event) => onSearch(event.target.value)}
      />
      {threads.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try a different search or wait for new signups."
        />
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const name = thread.displayName ?? thread.name;
            return (
            <button
              key={thread.userId}
              type="button"
              onClick={() => onSelect(thread.userId)}
              className={`flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm transition ${
                selected === thread.userId
                  ? "bg-background"
                  : thread.premium
                    ? "bg-primary/10 hover:border-primary/60"
                    : "bg-secondary/40 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border border-border text-xs font-semibold",
                    thread.unread ? "bg-primary/10 text-primary" : "bg-secondary"
                  )}
                >
                  {name
                    .split(" ")
                    .map((chunk) => chunk[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{name}</p>
                    {thread.pinned ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                        Pinned
                      </span>
                    ) : null}
                    {thread.role ? (
                      <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {activeFilter === "Athlete"
                          ? "Athlete"
                          : thread.role === "guardian"
                          ? "Guardian"
                          : thread.role}
                      </span>
                    ) : null}
                    {thread.online ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-success" title="Online" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {thread.typing ? "Typing..." : thread.preview}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {thread.premium ? <Badge variant="primary">Premium</Badge> : null}
                <p className="mt-2">{thread.time}</p>
                {thread.unread ? (
                  <div className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-white">
                    {thread.unread}
                  </div>
                ) : null}
              </div>
            </button>
          )})}
        </div>
      )}
    </div>
  );
}
