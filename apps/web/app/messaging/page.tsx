"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Megaphone, MessageCircle, Sparkles, Users2 } from "lucide-react";
import type { Socket } from "socket.io-client";

import { AnnouncementTab } from "../../components/admin/messaging/announcement-tab";
import { InboxTab } from "../../components/admin/messaging/inbox-tab";
import { StoriesTab } from "../../components/admin/messaging/stories-tab";
import { StatsTab } from "../../components/admin/messaging/stats-tab";
import { TeamsTab } from "../../components/admin/messaging/teams-tab";
import type {
  AdminTeamItem,
  DirectLiveHandlers,
  GroupLiveHandlers,
  ThreadListItem,
} from "../../components/admin/messaging/messaging-utils";
import {
  formatTime,
  getTierFromUser,
  isPremiumTier,
} from "../../components/admin/messaging/messaging-utils";
import type {
  AnnouncementItem,
  ChatGroupItem,
  ChatMessage,
  ChatReaction,
  MessagingUser,
} from "../../components/admin/messaging/types";
import { AdminShell } from "../../components/admin/shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  useGetAdminProfileQuery,
  useGetAdminTeamsQuery,
  useGetAnnouncementsQuery,
  useGetMessagingInboxQuery,
  useGetUsersQuery,
} from "@/lib/apiSlice";
import { getOrCreateAdminSocket } from "@/lib/admin-socket";

/** Clears a "Typing…" row whose typing:stop never arrived. */
const TYPING_TIMEOUT_MS = 5_000;

export default function MessagingPage() {
  return (
    <Suspense fallback={null}>
      <MessagingPageInner />
    </Suspense>
  );
}

function MessagingPageInner() {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState("inbox");
  const [highlightedInboxThreadUserId, setHighlightedInboxThreadUserId] =
    useState<number | null>(null);
  const [highlightedInboxGroupId, setHighlightedInboxGroupId] = useState<
    number | null
  >(null);
  const [highlightedTeamName, setHighlightedTeamName] = useState<string | null>(
    null,
  );
  const [requestedGroupId, setRequestedGroupId] = useState<number | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [typingUserIds, setTypingUserIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [groupTypingUserIds, setGroupTypingUserIds] = useState<
    ReadonlyMap<number, ReadonlySet<number>>
  >(() => new Map());

  const socketRef = useRef<Socket | null>(null);
  const typingExpiryRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const groupTypingExpiryRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const inboxRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const isWindowFocusedRef = useRef(true);
  const lastNotifiedRef = useRef<{
    kind: "direct" | "group";
    id: string;
  } | null>(null);
  const directHandlersRef = useRef<DirectLiveHandlers | null>(null);
  const groupHandlersRef = useRef<GroupLiveHandlers | null>(null);

  const { data: adminProfileData } = useGetAdminProfileQuery();
  const {
    data: inboxData,
    isLoading: isInboxLoading,
    isError: isInboxError,
    refetch: refetchInbox,
  } = useGetMessagingInboxQuery({
    limit: 300,
    includeAdminThreads: true,
  });
  const { data: usersData } = useGetUsersQuery();
  const {
    data: adminTeamsData,
    isLoading: isTeamsLoading,
    isError: isTeamsError,
    refetch: refetchTeams,
  } = useGetAdminTeamsQuery();
  const { data: announcementsData, isLoading: isAnnouncementsLoadingForStats } =
    useGetAnnouncementsQuery();

  const currentUserId = useMemo<number | null>(() => {
    const profilePayload = adminProfileData as
      | { user?: { id?: number | string } }
      | undefined;
    const idValue = profilePayload?.user?.id;
    const normalized = Number(idValue ?? NaN);
    return Number.isFinite(normalized) ? normalized : null;
  }, [adminProfileData]);

  const users = useMemo<MessagingUser[]>(
    () => (usersData?.users as MessagingUser[] | undefined) ?? [],
    [usersData],
  );

  const chatEligibleUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user?.role !== "admin" &&
          user?.role !== "superAdmin" &&
          user?.role !== "coach",
      ),
    [users],
  );

  const allUserNameById = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((user) => {
      map.set(user.id, user.name ?? user.email ?? `User ${user.id}`);
    });
    return map;
  }, [users]);

  const userNameById = useMemo(() => {
    const map = new Map<number, string>();
    chatEligibleUsers.forEach((user) => {
      map.set(user.id, user.name ?? user.email ?? `User ${user.id}`);
    });
    return map;
  }, [chatEligibleUsers]);

  const inboxThreads = useMemo<any[]>(
    () => (inboxData?.threads as any[] | undefined) ?? [],
    [inboxData],
  );

  const threads = useMemo<ThreadListItem[]>(() => {
    return inboxThreads
      .filter((thread) => thread?.type === "direct")
      .map((thread) => {
        const userId = Number(
          thread.peerUserId ??
            String(thread.id ?? "").replace(/^direct:/, ""),
        );
        const user = chatEligibleUsers.find(
          (candidate) => candidate.id === userId,
        );
        const tier = getTierFromUser(user ?? ({} as MessagingUser));
        return {
          userId,
          name:
            String(thread.name ?? "").trim() ||
            userNameById.get(userId) ||
            user?.name ||
            user?.email ||
            `User ${userId}`,
          preview: String(thread.preview ?? "Start a conversation"),
          unread: Number(thread.unread ?? 0) || 0,
          updatedAt: String(thread.updatedAt ?? ""),
          isPremium: isPremiumTier(tier),
          tierLabel: tier,
          online: onlineUserIds.has(userId),
          lastSeenAt: thread.lastSeenAt ? String(thread.lastSeenAt) : null,
        };
      })
      .filter(
        (thread) => Number.isFinite(thread.userId) && thread.userId > 0,
      )
      .sort((a, b) => {
        if (Number(b.isPremium) !== Number(a.isPremium))
          return Number(b.isPremium) - Number(a.isPremium);
        if (b.unread !== a.unread) return b.unread - a.unread;
        return (
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
        );
      });
  }, [chatEligibleUsers, inboxThreads, userNameById, onlineUserIds]);

  const groups = useMemo<ChatGroupItem[]>(
    () =>
      inboxThreads
        .filter((thread) => thread?.type === "group")
        .map((thread) => ({
          id: Number(
            thread.groupId ??
              String(thread.id ?? "").replace(/^group:/, ""),
          ),
          name: String(thread.name ?? "Group"),
          category: (thread.groupCategory as
            | "announcement"
            | "coach_group"
            | "team"
            | null) ?? "coach_group",
          teamId: Number.isFinite(Number(thread.teamId)) && Number(thread.teamId) > 0
            ? Number(thread.teamId)
            : null,
          createdAt: String(
            thread.lastMessageCreatedAt ??
              thread.updatedAt ??
              new Date(0).toISOString(),
          ),
          unreadCount: Number(thread.unread ?? 0) || 0,
          lastMessage: {
            id: String(
              thread.lastMessageId ??
                `${String(thread.groupId ?? "").trim()}:latest`,
            ),
            senderId:
              Number(thread.lastMessageSenderId ?? NaN) > 0
                ? Number(thread.lastMessageSenderId)
                : null,
            senderName:
              String(thread.lastMessageSenderName ?? "").trim() || null,
            senderProfilePicture:
              thread.lastMessageSenderProfilePicture ?? null,
            content: String(
              thread.lastMessageContent ??
                thread.preview ??
                "No messages yet",
            ),
            contentType: String(thread.lastMessageContentType ?? "text"),
            mediaUrl: null,
            createdAt: String(
              thread.lastMessageCreatedAt ??
                thread.updatedAt ??
                new Date(0).toISOString(),
            ),
          },
        }))
        .filter((group) => Number.isFinite(group.id) && group.id > 0),
    [inboxThreads],
  );

  const teams = useMemo<AdminTeamItem[]>(
    () => adminTeamsData?.teams ?? [],
    [adminTeamsData],
  );

  const announcements = useMemo<AnnouncementItem[]>(
    () => (announcementsData?.items as AnnouncementItem[] | undefined) ?? [],
    [announcementsData],
  );

  const stats = useMemo(() => {
    const unread = threads.reduce((sum, thread) => sum + thread.unread, 0);
    return {
      totalAnnouncements: announcements.length,
      totalThreads: threads.length,
      unreadThreads: unread,
      totalTeams: teams.length,
      totalGroups: groups.length,
    };
  }, [announcements.length, groups.length, teams.length, threads]);

  const resolveUserName = (userId: number) => {
    if (currentUserId != null && userId === currentUserId) return "You";
    return allUserNameById.get(userId) ?? `User ${userId}`;
  };

  const emitTyping = useMemo(
    () => (toUserId: number, isTyping: boolean) => {
      socketRef.current?.emit(isTyping ? "typing:start" : "typing:stop", {
        toUserId,
      });
    },
    [],
  );

  const emitGroupTyping = useMemo(
    () => (groupId: number, isTyping: boolean) => {
      socketRef.current?.emit(isTyping ? "typing:start" : "typing:stop", {
        groupId,
      });
    },
    [],
  );

  const scheduleInboxRefetch = useMemo(
    () => (delayMs = 120) => {
      if (inboxRefetchTimerRef.current) return;
      inboxRefetchTimerRef.current = setTimeout(() => {
        inboxRefetchTimerRef.current = null;
        refetchInbox();
      }, delayMs);
    },
    [refetchInbox],
  );

  useEffect(() => {
    const onFocus = () => {
      isWindowFocusedRef.current = true;
    };
    const onBlur = () => {
      isWindowFocusedRef.current = false;
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      if (inboxRefetchTimerRef.current)
        clearTimeout(inboxRefetchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    const subscriptions: Array<{
      event: string;
      listener: (...args: any[]) => void;
    }> = [];
    const on = (event: string, listener: (...args: any[]) => void) => {
      socket.on(event, listener);
      subscriptions.push({ event, listener });
    };
    socketRef.current = socket;

    on("connect", () => socket.emit("presence:request", {}));

    // The socket is created by the admin shell, so it is usually already connected by the time this
    // page mounts and the one-shot connect-time presence:sync has long since fired.
    if (socket.connected) socket.emit("presence:request", {});

    const canShowBrowserNotification = () => {
      if (typeof window === "undefined") return false;
      if (typeof Notification === "undefined") return false;
      if (Notification.permission !== "granted") return false;
      const hidden = document.visibilityState !== "visible";
      const focused = isWindowFocusedRef.current;
      return hidden || !focused;
    };

    const safeTextPreview = (raw: unknown) => {
      const input = String(raw ?? "").trim();
      const stripped = input
        .replace(/^\s*\[reply:\d+:[^\]]*\]\s*/i, "")
        .trim();
      return stripped || "New message";
    };

    const notifyBrowser = (params: {
      title: string;
      body: string;
      icon?: string | null;
      tag: string;
      url: string;
    }) => {
      if (!canShowBrowserNotification()) return;
      const prev = lastNotifiedRef.current;
      if (prev && prev.id === params.tag) return;
      lastNotifiedRef.current = {
        kind: params.tag.startsWith("group:") ? "group" : "direct",
        id: params.tag,
      };
      try {
        const notif = new Notification(params.title, {
          body: params.body,
          icon: params.icon ?? undefined,
          tag: params.tag,
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {
            // ignored
          }
          window.location.assign(params.url);
          notif.close();
        };
      } catch {
        // ignored
      }
    };

    on("message:new", (payload: any) => {
      if (payload?.clientTraceId || payload?.serverReceivedAt) {
        console.info("[RealtimeLatency] web.direct.socket_receive", {
          clientTraceId: payload?.clientTraceId ?? null,
          messageId: payload?.id ?? null,
          socketConnected: socket.connected,
          socketTransport: socket.io.engine.transport.name,
          serverToClientElapsedMs:
            typeof payload?.serverReceivedAt === "number"
              ? Date.now() - payload.serverReceivedAt
              : null,
        });
      }
      const senderId = Number(payload?.senderId ?? NaN);
      const receiverId = Number(payload?.receiverId ?? NaN);
      const me = currentUserIdRef.current;
      if (me != null && Number.isFinite(senderId) && senderId === me) return;
      const threadUserId = Number.isFinite(senderId)
        ? senderId
        : Number.isFinite(receiverId)
          ? receiverId
          : null;
      if (!threadUserId) return;
      const activeThreadUserId =
        directHandlersRef.current?.getActiveThreadUserId() ?? null;
      if (threadUserId !== activeThreadUserId) scheduleInboxRefetch(500);
      if (
        activeThreadUserId &&
        Number.isFinite(activeThreadUserId) &&
        threadUserId === activeThreadUserId &&
        Number.isFinite(Number(payload?.id))
      ) {
        const liveMessage: ChatMessage = {
          id: Number(payload.id),
          senderId: Number(payload?.senderId ?? 0),
          receiverId: Number(payload?.receiverId ?? 0),
          content: String(payload?.content ?? ""),
          contentType: String(payload?.contentType ?? "text") as
            | "text"
            | "image"
            | "video",
          mediaUrl: payload?.mediaUrl ?? null,
          createdAt:
            String(payload?.createdAt ?? "").trim() ||
            new Date().toISOString(),
          senderName: String(payload?.senderName ?? "").trim() || null,
          senderProfilePicture: payload?.senderProfilePicture ?? null,
          reactions: Array.isArray(payload?.reactions)
            ? payload.reactions
            : [],
        };
        directHandlersRef.current?.onDirectMessage(liveMessage);
      } else {
        directHandlersRef.current?.scheduleDirectRefetch(150);
      }
      const title = payload?.senderName
        ? `New message from ${String(payload.senderName)}`
        : `New message from ${resolveUserName(threadUserId)}`;
      const body =
        String(payload?.contentType ?? "").toLowerCase() === "image"
          ? "Sent a photo"
          : String(payload?.contentType ?? "").toLowerCase() === "video"
            ? "Sent a video"
            : safeTextPreview(payload?.content);
      notifyBrowser({
        title,
        body,
        icon: payload?.senderProfilePicture ?? null,
        tag: `direct:${String(payload?.id ?? `${Date.now()}`)}`,
        url: `/messaging?tab=inbox&userId=${threadUserId}`,
      });
    });

    on("group:message", (payload: any) => {
      if (payload?.clientTraceId || payload?.serverReceivedAt) {
        console.info("[RealtimeLatency] web.group.socket_receive", {
          clientTraceId: payload?.clientTraceId ?? null,
          messageId: payload?.id ?? null,
          groupId: payload?.groupId ?? null,
          socketConnected: socket.connected,
          socketTransport: socket.io.engine.transport.name,
          serverToClientElapsedMs:
            typeof payload?.serverReceivedAt === "number"
              ? Date.now() - payload.serverReceivedAt
              : null,
        });
      }
      groupHandlersRef.current?.scheduleGroupRefetch(120);
      const incomingGroupId = Number(payload?.groupId ?? NaN);
      const activeGroupId =
        groupHandlersRef.current?.getActiveGroupId() ?? null;
      if (incomingGroupId !== activeGroupId) scheduleInboxRefetch(500);
      if (!Number.isFinite(incomingGroupId) || incomingGroupId <= 0) return;
      if (Number.isFinite(Number(payload?.id))) {
        const liveMessage: ChatMessage = {
          id: Number(payload.id),
          senderId: Number(payload?.senderId ?? 0),
          receiverId: null,
          content: String(payload?.content ?? ""),
          contentType: String(payload?.contentType ?? "text") as
            | "text"
            | "image"
            | "video",
          mediaUrl: payload?.mediaUrl ?? null,
          createdAt:
            String(payload?.createdAt ?? "").trim() ||
            new Date().toISOString(),
          senderName: String(payload?.senderName ?? "").trim() || null,
          senderProfilePicture: payload?.senderProfilePicture ?? null,
          reactions: Array.isArray(payload?.reactions)
            ? payload.reactions
            : [],
        };
        groupHandlersRef.current?.onGroupMessage(liveMessage, incomingGroupId);
      }
      const senderId = Number(payload?.senderId ?? NaN);
      const me = currentUserIdRef.current;
      if (me != null && Number.isFinite(senderId) && senderId === me) return;
      const senderLabel =
        String(payload?.senderName ?? "").trim() ||
        (Number.isFinite(senderId)
          ? resolveUserName(senderId)
          : "New message");
      const groupLabel =
        String(payload?.groupName ?? "").trim() || "Group";
      const title = `${senderLabel} in ${groupLabel}`;
      const body =
        String(payload?.contentType ?? "").toLowerCase() === "image"
          ? "Sent a photo"
          : String(payload?.contentType ?? "").toLowerCase() === "video"
            ? "Sent a video"
            : String(payload?.content ?? "").trim() || "New message";
      notifyBrowser({
        title,
        body,
        icon: payload?.senderProfilePicture ?? null,
        tag: `group:${String(payload?.id ?? `${Date.now()}`)}`,
        url: `/messaging?tab=inbox&groupId=${incomingGroupId}`,
      });
    });

    on("message:read", (payload: any) => {
      scheduleInboxRefetch(120);
      const activeThreadUserId =
        directHandlersRef.current?.getActiveThreadUserId() ?? null;
      const curUserId = currentUserIdRef.current;
      if (!activeThreadUserId || curUserId == null) return;
      const readerUserId = Number(payload?.readerUserId ?? NaN);
      const peerUserIds = Array.isArray(payload?.peerUserIds)
        ? payload.peerUserIds
            .map((id: unknown) => Number(id))
            .filter((id: number) => Number.isFinite(id))
        : [];
      const involvesActiveThread =
        activeThreadUserId === readerUserId ||
        peerUserIds.includes(activeThreadUserId);
      const involvesCurrentUser =
        curUserId === readerUserId || peerUserIds.includes(curUserId);
      if (involvesActiveThread && involvesCurrentUser) {
        directHandlersRef.current?.scheduleDirectRefetch(120);
      }
    });

    on("group:read", (payload: any) => {
      scheduleInboxRefetch(120);
      const activeGroupId =
        groupHandlersRef.current?.getActiveGroupId() ?? null;
      const payloadGroupId = Number(payload?.groupId ?? NaN);
      if (
        activeGroupId &&
        Number.isFinite(payloadGroupId) &&
        payloadGroupId === activeGroupId
      ) {
        groupHandlersRef.current?.scheduleGroupRefetch(120);
      }
    });

    on("message:reaction", (payload: any) => {
      const messageId = Number(payload?.messageId ?? NaN);
      if (!Number.isFinite(messageId)) return;
      if (Array.isArray(payload?.reactions)) {
        directHandlersRef.current?.onDirectReaction(
          messageId,
          payload.reactions as ChatReaction[],
        );
      }
      directHandlersRef.current?.scheduleDirectRefetch(120);
    });

    on("group:reaction", (payload: any) => {
      const payloadGroupId = Number(payload?.groupId ?? NaN);
      const messageId = Number(payload?.messageId ?? NaN);
      if (!Number.isFinite(payloadGroupId) || !Number.isFinite(messageId))
        return;
      if (Array.isArray(payload?.reactions)) {
        groupHandlersRef.current?.onGroupReaction(
          payloadGroupId,
          messageId,
          payload.reactions as ChatReaction[],
        );
      }
      const activeGroupId =
        groupHandlersRef.current?.getActiveGroupId() ?? null;
      if (activeGroupId && payloadGroupId === activeGroupId) {
        groupHandlersRef.current?.scheduleGroupRefetch(120);
      }
      scheduleInboxRefetch(120);
    });

    // The server scopes presence to the users you share a direct conversation with, so this is
    // bounded by the size of the admin's inbox — never the platform's online roster.
    on("presence:sync", (payload: any) => {
      const ids = Array.isArray(payload?.online) ? payload.online : [];
      setOnlineUserIds(new Set(ids.map(Number).filter(Number.isFinite)));
    });

    on("presence:changed", (payload: any) => {
      const userId = Number(payload?.userId ?? NaN);
      if (!Number.isFinite(userId)) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (payload?.online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    on("typing:update", (payload: any) => {
      const fromUserId = Number(payload?.fromUserId ?? NaN);
      if (!Number.isFinite(fromUserId)) return;

      if (payload?.scope === "group") {
        const groupId = Number(payload?.groupId ?? NaN);
        if (!Number.isFinite(groupId)) return;
        const key = `${groupId}:${fromUserId}`;
        const timers = groupTypingExpiryRef.current;
        const pending = timers.get(key);
        if (pending) clearTimeout(pending);
        timers.delete(key);

        const setGroupTyping = (isTyping: boolean) =>
          setGroupTypingUserIds((current) => {
            const next = new Map(current);
            const existing = new Set(next.get(groupId) ?? []);
            if (isTyping) existing.add(fromUserId);
            else existing.delete(fromUserId);
            next.set(groupId, existing);
            return next;
          });

        if (!payload?.isTyping) {
          setGroupTyping(false);
          return;
        }
        setGroupTyping(true);
        timers.set(
          key,
          setTimeout(() => {
            timers.delete(key);
            setGroupTyping(false);
          }, TYPING_TIMEOUT_MS),
        );
        return;
      }

      if (payload?.scope !== "direct") return;

      const timers = typingExpiryRef.current;
      const pending = timers.get(fromUserId);
      if (pending) clearTimeout(pending);
      timers.delete(fromUserId);

      const setTyping = (isTyping: boolean) =>
        setTypingUserIds((current) => {
          const next = new Set(current);
          if (isTyping) next.add(fromUserId);
          else next.delete(fromUserId);
          return next;
        });

      if (!payload?.isTyping) {
        setTyping(false);
        return;
      }
      setTyping(true);
      // A dropped typing:stop (tab closed, network flap) would otherwise leave the row stuck
      // on "Typing…" forever.
      timers.set(
        fromUserId,
        setTimeout(() => {
          timers.delete(fromUserId);
          setTyping(false);
        }, TYPING_TIMEOUT_MS),
      );
    });

    return () => {
      for (const { event, listener } of subscriptions) {
        socket.off(event, listener);
      }
      for (const timer of typingExpiryRef.current.values()) clearTimeout(timer);
      typingExpiryRef.current.clear();
      for (const timer of groupTypingExpiryRef.current.values()) clearTimeout(timer);
      groupTypingExpiryRef.current.clear();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["announcement", "inbox", "teams", "stats", "stories"].includes(tabParam)
    ) {
      setTab(tabParam);
    }

    const userIdParam = Number(searchParams.get("userId"));
    if (Number.isFinite(userIdParam) && userIdParam > 0) {
      const exists = threads.some((thread) => thread.userId === userIdParam);
      if (exists) {
        setTab("inbox");
        setHighlightedInboxThreadUserId(userIdParam);
      }
    }

    const groupIdParam = Number(searchParams.get("groupId"));
    if (Number.isFinite(groupIdParam) && groupIdParam > 0) {
      const exists = groups.some((group) => group.id === groupIdParam);
      if (exists) {
        setTab("inbox");
        setHighlightedInboxGroupId(groupIdParam);
        setRequestedGroupId(groupIdParam);
      }
    }

    const teamParam = (searchParams.get("team") ?? "").trim();
    if (teamParam) {
      setTab("teams");
      setHighlightedTeamName(teamParam.toLowerCase());
    } else {
      setHighlightedTeamName(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <AdminShell
      title="Messaging"
      subtitle="Announcements, inbox messaging, team groups, and communication stats."
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "")}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              Inbox
              {stats.unreadThreads > 0 ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {stats.unreadThreads > 99 ? "99+" : stats.unreadThreads}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="announcement"
              className="flex items-center gap-2"
            >
              <Megaphone className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Announcements</span>
              <span className="sm:hidden">Announce</span>
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              Stories
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users2 className="h-4 w-4 shrink-0" /> Teams
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0" /> Stats
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox">
          <InboxTab
            threads={threads}
            groups={groups}
            users={users}
            typingUserIds={typingUserIds}
            onTypingChange={emitTyping}
            groupTypingUserIds={groupTypingUserIds}
            onGroupTypingChange={emitGroupTyping}
            currentUserId={currentUserId}
            resolveUserName={resolveUserName}
            formatTime={formatTime}
            scheduleInboxRefetch={scheduleInboxRefetch}
            refetchInbox={refetchInbox}
            isInboxLoading={isInboxLoading}
            isInboxError={isInboxError}
            highlightedInboxThreadUserId={highlightedInboxThreadUserId}
            highlightedInboxGroupId={highlightedInboxGroupId}
            setHighlightedInboxGroupId={setHighlightedInboxGroupId}
            requestedGroupId={requestedGroupId}
            onRequestedGroupHandled={() => setRequestedGroupId(null)}
            registerDirectLiveHandlers={(handlers) => {
              directHandlersRef.current = handlers;
            }}
            registerGroupLiveHandlers={(handlers) => {
              groupHandlersRef.current = handlers;
            }}
          />
        </TabsContent>

        <TabsContent value="announcement">
          <AnnouncementTab
            groups={groups}
            teams={teams}
            resolveUserName={resolveUserName}
            formatTime={formatTime}
          />
        </TabsContent>

        <TabsContent value="stories">
          <StoriesTab />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsTab
            teams={teams}
            groups={groups}
            users={users}
            currentUserId={currentUserId}
            resolveUserName={resolveUserName}
            formatTime={formatTime}
            scheduleInboxRefetch={scheduleInboxRefetch}
            refetchInbox={refetchInbox}
            groupTypingUserIds={groupTypingUserIds}
            onGroupTypingChange={emitGroupTyping}
            isTeamsLoading={isTeamsLoading}
            isTeamsError={isTeamsError}
            onRetryTeams={refetchTeams}
            highlightedTeamName={highlightedTeamName}
            registerGroupLiveHandlers={(handlers) => {
              groupHandlersRef.current = handlers;
            }}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsTab
            stats={stats}
            isLoading={isInboxLoading || isTeamsLoading || isAnnouncementsLoadingForStats}
            onNavigateToTab={setTab}
          />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
