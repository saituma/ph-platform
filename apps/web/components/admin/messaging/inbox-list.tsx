import { useEffect, useRef, useState } from "react";
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
  const [menuState, setMenuState] = useState<{
    userId: number;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuState) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      setMenuState(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [menuState]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["All", "Unread", "Premium"].map((chip) => (
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
              onContextMenu={(event) => {
                event.preventDefault();
                setMenuState({ userId: thread.userId, x: event.clientX, y: event.clientY });
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
                {thread.avatarUrl ? (
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-border">
                    <img
                      src={thread.avatarUrl}
                      alt={name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
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
                )}
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
                        {thread.role === "guardian" ? "Guardian" : thread.role}
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
      {menuState ? (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-xl border border-border bg-background p-2 text-sm shadow-lg"
          style={{ left: menuState.x, top: menuState.y }}
        >
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary/60"
            onClick={() => {
              onMarkRead(menuState.userId);
              setMenuState(null);
            }}
          >
            Mark Read
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/10"
            onClick={() => {
              onDeleteThread(menuState.userId);
              setMenuState(null);
            }}
          >
            Delete Chat
          </button>
        </div>
      ) : null}
    </div>
  );
}
