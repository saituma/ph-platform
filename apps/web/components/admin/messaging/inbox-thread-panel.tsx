"use client";

import { MessageCircleMore, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Input } from "../../ui/input";
import { ScrollArea } from "../../ui/scroll-area";
import { SectionHeader } from "../section-header";

type ThreadListItem = {
  userId: number;
  name: string;
  preview: string;
  unread: number;
  updatedAt: string;
  isPremium: boolean;
  tierLabel: string | null;
};

type InboxThreadPanelProps = {
  threads: ThreadListItem[];
  highlightedUserId?: number | null;
  onOpenThread: (userId: number) => void;
  onCreateGroup: () => void;
  formatTime: (value?: string | null) => string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function cleanPreview(raw: string) {
  const input = String(raw ?? "");
  const stripped = input.replace(/^\[reply:\d+:[^\]]*\]\s*/i, "");
  const clean = stripped.trim();
  if (!clean) return "File";

  const fromAttachedLabel = clean.match(/^file attached:\s*(.+)$/i);
  if (fromAttachedLabel?.[1]) return fromAttachedLabel[1].trim();

  if (/^attachment$/i.test(clean)) return "File";
  return clean;
}

export function InboxThreadPanel({
  threads,
  highlightedUserId = null,
  onOpenThread,
  onCreateGroup,
  formatTime,
}: InboxThreadPanelProps) {
  const [query, setQuery] = useState("");
  const threadRowRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      const name = thread.name.toLowerCase();
      const preview = cleanPreview(thread.preview).toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [query, threads]);

  const totalUnread = useMemo(
    () => filteredThreads.reduce((sum, thread) => sum + Number(thread.unread ?? 0), 0),
    [filteredThreads],
  );

  useEffect(() => {
    if (!highlightedUserId) return;
    const target = threadRowRefs.current[highlightedUserId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedUserId]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Card className="min-h-[78vh]">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              title="Inbox"
              description="Open a user thread to chat individually in a focused modal."
            />
            <Button size="sm" variant="outline" onClick={onCreateGroup}>
              Create group
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or message..."
                className="pl-9"
              />
            </div>
            <div className="rounded-full border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {totalUnread} unread
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[68vh] pr-2">
            <div className="space-y-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.userId}
                  ref={(node) => {
                    threadRowRefs.current[thread.userId] = node;
                  }}
                  type="button"
                  onClick={() => onOpenThread(thread.userId)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border bg-card/60 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 ${
                    highlightedUserId === thread.userId
                      ? "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
                      : "border-border/70"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initials(thread.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{thread.name}</p>
                        {thread.isPremium ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                            Premium
                          </span>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatTime(thread.updatedAt)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-muted-foreground">{cleanPreview(thread.preview)}</p>
                      {thread.unread > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                          {thread.unread}
                        </span>
                      ) : (
                        <MessageCircleMore className="h-4 w-4 text-muted-foreground/50 opacity-0 transition group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {!filteredThreads.length ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Inbox is empty.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
