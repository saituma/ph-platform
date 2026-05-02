"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MessageCircle } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGetThreadsQuery } from "../../../lib/apiSlice";

export default function ParentMessagesPage() {
  const { data: threadsData, isLoading } = useGetThreadsQuery();

  const recentThreads = useMemo(() => {
    const threads = threadsData?.threads ?? [];
    return threads.slice(0, 10);
  }, [threadsData]);

  return (
    <ParentShell title="Messages" subtitle="Parent and athlete conversations.">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {recentThreads.length} conversation{recentThreads.length !== 1 ? "s" : ""}
          </p>
          <Button render={<Link href="/messaging" />}>
            Open Full Messaging
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`msg-skel-${i}`} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : recentThreads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <Button variant="outline" render={<Link href="/messaging" />}>
                Start a Conversation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentThreads.map((thread: { threadId: number; otherPartyName?: string | null; lastMessage?: string | null; unreadCount?: number; updatedAt?: string | null }) => (
              <Link key={thread.threadId} href="/messaging">
                <Card className="transition hover:border-primary/40">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {thread.otherPartyName ?? "Conversation"}
                        </p>
                        {(thread.unreadCount ?? 0) > 0 && (
                          <Badge>{thread.unreadCount}</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {thread.lastMessage ?? "No messages yet"}
                      </p>
                    </div>
                    {thread.updatedAt && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(thread.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ParentShell>
  );
}
