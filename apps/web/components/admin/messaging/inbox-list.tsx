import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../ui/input-group";
import { Button } from "../../ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "../../ui/empty";
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
  avatarUrl?: string | null;
};

type InboxListProps = {
  threads: Thread[];
  selected?: number | null;
  onSelect: (userId: number) => void;
  onMarkRead: (userId: number) => void;
  onDeleteThread: (userId: number) => void;
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
  onMarkRead,
  onDeleteThread,
  onFilterSelect,
  searchValue,
  onSearch,
  activeFilter,
  counts,
}: InboxListProps) {
  const [contextMenuUserId, setContextMenuUserId] = useState<number | null>(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenuUserId === null) return;
    const handleClick = () => setContextMenuUserId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenuUserId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["All", "Unread", "Premium"].map((chip) => (
          <Button
            key={chip}
            variant={activeFilter === chip ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap"
            onClick={() => onFilterSelect(chip)}
          >
            {counts?.[chip] ? `${chip} (${counts[chip]})` : chip}
          </Button>
        ))}
      </div>

      <InputGroup>
        <InputGroupAddon>
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search conversations"
          value={searchValue}
          onChange={(event) => onSearch(event.target.value)}
        />
      </InputGroup>

      {threads.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>Try a different search or wait for new signups.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const name = thread.displayName ?? thread.name;
            const initials = name
              .split(" ")
              .map((chunk) => chunk[0])
              .slice(0, 2)
              .join("");

            return (
              <div key={thread.userId} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(thread.userId)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenuAnchor({ x: event.clientX, y: event.clientY });
                    setContextMenuUserId(thread.userId);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border border-border p-4 text-left text-sm transition ${
                    selected === thread.userId
                      ? "bg-background"
                      : thread.premium
                        ? "bg-primary/10 hover:border-primary/60"
                        : "bg-secondary/40 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      className={cn(
                        "h-10 w-10 border border-border text-xs font-semibold",
                        !thread.avatarUrl && (thread.unread ? "bg-primary/10 text-primary" : "bg-secondary"),
                      )}
                    >
                      {thread.avatarUrl ? (
                        <AvatarImage src={thread.avatarUrl} alt={name} />
                      ) : null}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{name}</p>
                        {thread.pinned ? (
                          <Badge variant="secondary" size="sm">Pinned</Badge>
                        ) : null}
                        {thread.role ? (
                          <Badge variant="secondary" size="sm">
                            {thread.role === "guardian" ? "Guardian" : thread.role}
                          </Badge>
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
                    {thread.premium ? <Badge variant="default">Premium</Badge> : null}
                    <p className="mt-2">{thread.time}</p>
                    {thread.unread ? (
                      <div className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-white">
                        {thread.unread}
                      </div>
                    ) : null}
                  </div>
                </button>

                {/* Context menu via COSS Menu anchored to position */}
                {contextMenuUserId === thread.userId && contextMenuAnchor ? (
                  <div
                    className="fixed z-50 min-w-[160px] rounded-xl border border-border bg-background p-2 text-sm shadow-lg"
                    style={{ left: contextMenuAnchor.x, top: contextMenuAnchor.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary/60"
                      onClick={() => {
                        onMarkRead(thread.userId);
                        setContextMenuUserId(null);
                      }}
                    >
                      Mark Read
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        onDeleteThread(thread.userId);
                        setContextMenuUserId(null);
                      }}
                    >
                      Delete Chat
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
