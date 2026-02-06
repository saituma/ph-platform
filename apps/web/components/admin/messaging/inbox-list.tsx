import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { EmptyState } from "../empty-state";
import { cn } from "../../../lib/utils";

type Thread = {
  name: string;
  preview: string;
  time: string;
  priority: boolean;
  unread?: number;
  pinned?: boolean;
};

type InboxListProps = {
  threads: Thread[];
  selected?: string | null;
  onSelect: (name: string) => void;
  onFilterSelect: (chip: string) => void;
};

export function InboxList({
  threads,
  selected,
  onSelect,
  onFilterSelect,
}: InboxListProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-auto pb-1 md:hidden">
        {["All", "Premium", "Unread", "Needs Reply"].map((chip) => (
          <Button
            key={chip}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => onFilterSelect(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
      <Input placeholder="Search conversations" />
      {threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="New conversations will appear here."
        />
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.name}
              type="button"
              onClick={() => onSelect(thread.name)}
              className={`flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm transition ${
                selected === thread.name
                  ? "bg-background"
                  : "bg-secondary/40 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border border-border text-xs font-semibold",
                    thread.priority ? "bg-primary/10 text-primary" : "bg-secondary"
                  )}
                >
                  {thread.name
                    .split(" ")
                    .map((chunk) => chunk[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{thread.name}</p>
                    {thread.pinned ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                        Pinned
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{thread.preview}</p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {thread.priority ? <Badge variant="primary">Premium</Badge> : null}
                <p className="mt-2">{thread.time}</p>
                {thread.unread ? (
                  <div className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-white">
                    {thread.unread}
                  </div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
