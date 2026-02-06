"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { InboxList } from "../../components/admin/messaging/inbox-list";
import { ConversationPanel } from "../../components/admin/messaging/conversation-panel";
import { MessageDialogs, type MessagingDialog } from "../../components/admin/messaging/message-dialogs";

const threads = [
  {
    name: "Ava Patterson",
    preview: "Knee is sore after practice",
    time: "2m",
    priority: true,
    unread: 2,
    pinned: true,
  },
  {
    name: "Miles Turner",
    preview: "Uploaded the latest sprint video",
    time: "1h",
    priority: true,
    unread: 1,
  },
  {
    name: "Kayla Davis",
    preview: "Thanks for the warmup notes",
    time: "3h",
    priority: false,
  },
  {
    name: "PHP Plus Cohort",
    preview: "Group call questions list",
    time: "Yesterday",
    priority: false,
  },
];

const messagesByThread: Record<
  string,
  {
    author: string;
    time: string;
    text: string;
    reactions?: { emoji: string; count: number }[];
    status?: "sent" | "delivered" | "read";
  }[]
> = {
  "Ava Patterson": [
    {
      author: "Ava",
      time: "11:02",
      text: "Knee is sore after practice. Should I reduce today’s workload?",
      reactions: [
        { emoji: "💪", count: 1 },
        { emoji: "🙏", count: 1 },
      ],
    },
    {
      author: "Coach",
      time: "11:10",
      text: "Let’s cut volume by 20% and focus on recovery work tonight.",
      status: "read",
    },
  ],
  "Miles Turner": [
    {
      author: "Miles",
      time: "09:40",
      text: "Uploaded the latest sprint video. Can you review form?",
      reactions: [{ emoji: "👀", count: 1 }],
    },
  ],
  "Kayla Davis": [
    {
      author: "Kayla",
      time: "Yesterday",
      text: "Thanks for the warmup notes!",
    },
  ],
  "PHP Plus Cohort": [
    {
      author: "Parent Group",
      time: "Yesterday",
      text: "What should we bring for the group call?",
      status: "delivered",
    },
  ],
};

const profiles: Record<
  string,
  { tier: string; status: string; lastActive: string; tags: string[] }
> = {
  "Ava Patterson": {
    tier: "Premium",
    status: "Active",
    lastActive: "2m ago",
    tags: ["Knee Rehab", "Priority"],
  },
  "Miles Turner": {
    tier: "Premium",
    status: "Active",
    lastActive: "1h ago",
    tags: ["Speed Work"],
  },
  "Kayla Davis": {
    tier: "Plus",
    status: "Active",
    lastActive: "3h ago",
    tags: ["Warmups"],
  },
  "PHP Plus Cohort": {
    tier: "Plus",
    status: "Group",
    lastActive: "Yesterday",
    tags: ["Group Call"],
  },
};

export default function MessagingPage() {
  const [activeDialog, setActiveDialog] = useState<MessagingDialog>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(
    threads[0]?.name ?? null
  );
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [messagesState, setMessagesState] = useState(messagesByThread);
  const [myReactions, setMyReactions] = useState<Record<string, string | null>>({});

  const filteredThreads = useMemo(() => {
    if (activeFilter === "All") return threads;
    if (activeFilter === "Premium") return threads.filter((thread) => thread.priority);
    return threads;
  }, [activeFilter]);

  return (
    <AdminShell
      title="Messaging"
      subtitle="Priority inbox and coach responses."
      actions={<Button onClick={() => setActiveDialog("new-message")}>New Message</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="h-full">
          <CardHeader>
            <SectionHeader title="Inbox" description="Priority messages are pinned." />
          </CardHeader>
          <CardContent>
            <InboxList
              threads={filteredThreads}
              selected={selectedThread}
              onSelect={setSelectedThread}
              onFilterSelect={setActiveFilter}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <SectionHeader
              title={selectedThread ?? "Conversation"}
              description={
                selectedThread
                  ? `${profiles[selectedThread]?.tier ?? "Client"} • ${
                      profiles[selectedThread]?.lastActive ?? "Active"
                    }`
                  : "Select a thread"
              }
            />
          </CardHeader>
          <CardContent>
            <ConversationPanel
              name={selectedThread}
              messages={selectedThread ? messagesState[selectedThread] ?? [] : []}
              profile={selectedThread ? profiles[selectedThread] ?? null : null}
              onReact={(messageIndex, emoji) => {
                if (!selectedThread) return;
                setMessagesState((prev) => {
                  const next = { ...prev };
                  const threadMessages = [...(next[selectedThread] ?? [])];
                  const message = { ...threadMessages[messageIndex] };
                  const reactions = message.reactions ? [...message.reactions] : [];
                  const key = `${selectedThread}-${messageIndex}`;
                  const previousEmoji = myReactions[key];
                  if (previousEmoji === emoji) {
                    const target = reactions.find((r) => r.emoji === emoji);
                    if (target) {
                      target.count = Math.max(0, target.count - 1);
                    }
                    setMyReactions((prevMap) => ({ ...prevMap, [key]: null }));
                  } else {
                    if (previousEmoji) {
                      const previousTarget = reactions.find((r) => r.emoji === previousEmoji);
                      if (previousTarget) {
                        previousTarget.count = Math.max(0, previousTarget.count - 1);
                      }
                    }
                    const existing = reactions.find((r) => r.emoji === emoji);
                    if (existing) {
                      existing.count += 1;
                    } else {
                      reactions.push({ emoji, count: 1 });
                    }
                    setMyReactions((prevMap) => ({ ...prevMap, [key]: emoji }));
                  }
                  message.reactions = reactions.filter((r) => r.count > 0);
                  threadMessages[messageIndex] = message;
                  next[selectedThread] = threadMessages;
                  return next;
                });
              }}
            />
          </CardContent>
        </Card>
      </div>

      <MessageDialogs active={activeDialog} onClose={() => setActiveDialog(null)} />
    </AdminShell>
  );
}
