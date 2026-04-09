import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { ComposerActionsModal } from "@/components/messages/ComposerActionsModal";
import { EmojiPickerModal } from "@/components/messages/EmojiPickerModal";
import { GifPickerModal } from "@/components/messages/GifPickerModal";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useSocket } from "@/context/SocketContext";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HeaderTabKey = "announcement" | "inbox" | "teams" | "stats";

type AdminDmThread = {
  userId: number;
  name?: string | null;
  preview?: string | null;
  time?: string | Date | null;
  unread?: number | null;
  programTier?: string | null;
  premium?: boolean | null;
};

type DirectMessage = {
  id?: number;
  clientId?: string | null;
  senderId?: number;
  receiverId?: number;
  content?: string | null;
  contentType?: "text" | "image" | "video" | string | null;
  mediaUrl?: string | null;
  videoUploadId?: number | null;
  createdAt?: string | Date | null;
  read?: boolean | null;
};

type ChatGroup = {
  id: number;
  name?: string | null;
  category?: string | null;
  unreadCount?: number | null;
  lastMessage?: {
    content?: string | null;
    createdAt?: string | Date | null;
  } | null;
};

type GroupMessage = {
  id?: number;
  clientId?: string | null;
  groupId?: number;
  senderId?: number;
  content?: string | null;
  contentType?: "text" | "image" | "video" | string | null;
  mediaUrl?: string | null;
  createdAt?: string | Date | null;
  reactions?: any[];
};

type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
};

type AdminUserResult = {
  id?: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type GroupMember = {
  userId: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profilePicture?: string | null;
};

function formatWhen(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function safeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stripPreview(value: unknown) {
  const text =
    typeof value === "string" ? value : value == null ? "" : String(value);
  return text.replace(/^\[reply:[^\]]+\]\s*/i, "").trim();
}

function categoryLabel(category: string | null | undefined) {
  switch ((category ?? "").toLowerCase()) {
    case "announcement":
      return "Announcement";
    case "team":
      return "Team";
    case "coach_group":
      return "Coach Group";
    default:
      return "Group";
  }
}

export default function AdminMessagesScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const myUserId = useAppSelector((state) => state.user.profile?.id);
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<HeaderTabKey>("inbox");

  // =============== INBOX (Admin DMs) ===============
  const [dmQuery, setDmQuery] = useState("");
  const [dmThreads, setDmThreads] = useState<AdminDmThread[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);

  // =============== GROUPS (Announcements / Teams) ===============
  const [groupQuery, setGroupQuery] = useState("");
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // =============== MODALS ===============
  const [activeDmUserId, setActiveDmUserId] = useState<number | null>(null);
  const [activeDmName, setActiveDmName] = useState<string>("");
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmThreadLoading, setDmThreadLoading] = useState(false);
  const [dmThreadError, setDmThreadError] = useState<string | null>(null);
  const [dmDraft, setDmDraft] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [dmComposerMenuOpen, setDmComposerMenuOpen] = useState(false);
  const [dmGifPickerOpen, setDmGifPickerOpen] = useState(false);
  const [dmEmojiPickerOpen, setDmEmojiPickerOpen] = useState(false);
  const [dmIsUploadingAttachment, setDmIsUploadingAttachment] = useState(false);
  const [dmPendingAttachment, setDmPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [dmVideoUploadId, setDmVideoUploadId] = useState<number | null>(null);

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string>("");
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupThreadLoading, setGroupThreadLoading] = useState(false);
  const [groupThreadError, setGroupThreadError] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState("");
  const [groupSending, setGroupSending] = useState(false);
  const [groupComposerMenuOpen, setGroupComposerMenuOpen] = useState(false);
  const [groupGifPickerOpen, setGroupGifPickerOpen] = useState(false);
  const [groupEmojiPickerOpen, setGroupEmojiPickerOpen] = useState(false);
  const [groupIsUploadingAttachment, setGroupIsUploadingAttachment] =
    useState(false);
  const [groupPendingAttachment, setGroupPendingAttachment] =
    useState<PendingAttachment | null>(null);

  // =============== GROUP MANAGEMENT ===============
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupMemberIds, setCreateGroupMemberIds] = useState<number[]>(
    [],
  );
  const [createGroupSaving, setCreateGroupSaving] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const [groupMembersOpen, setGroupMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembersError, setGroupMembersError] = useState<string | null>(
    null,
  );

  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userPickerTitle, setUserPickerTitle] = useState("Select members");
  const [userPickerQuery, setUserPickerQuery] = useState("");
  const [userPickerResults, setUserPickerResults] = useState<AdminUserResult[]>(
    [],
  );
  const [userPickerLoading, setUserPickerLoading] = useState(false);
  const [userPickerError, setUserPickerError] = useState<string | null>(null);
  const [userPickerSelected, setUserPickerSelected] = useState<
    Record<number, boolean>
  >({});
  const userPickerModeRef = useRef<"create" | "addMembers">("create");

  const dmQueryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupQueryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const tokenRef = useRef<string | null>(token ?? null);
  const bootstrapReadyRef = useRef<boolean>(bootstrapReady);
  const myUserIdRef = useRef<string | number | null>(myUserId ?? null);
  const activeDmUserIdRef = useRef<number | null>(null);
  const activeGroupIdRef = useRef<number | null>(null);

  useEffect(() => {
    tokenRef.current = token ?? null;
  }, [token]);
  useEffect(() => {
    bootstrapReadyRef.current = bootstrapReady;
  }, [bootstrapReady]);
  useEffect(() => {
    myUserIdRef.current = myUserId ?? null;
  }, [myUserId]);
  useEffect(() => {
    activeDmUserIdRef.current = activeDmUserId;
  }, [activeDmUserId]);
  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  const uploadAttachment = useCallback(async (input: PendingAttachment) => {
    const t = tokenRef.current;
    if (!t) throw new Error("Authentication required");

    const folder = input.isImage ? "messages/images" : "messages/files";
    const presign = await apiRequest<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
    }>("/media/presign", {
      method: "POST",
      token: t,
      body: {
        folder,
        fileName: input.fileName,
        contentType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
      skipCache: true,
    });

    const fileResponse = await fetch(input.uri);
    const blob = await fileResponse.blob();
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": input.mimeType,
      },
      body: blob,
    });
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload attachment");
    }

    const contentType: "text" | "image" | "video" = input.mimeType.startsWith(
      "image/",
    )
      ? "image"
      : input.mimeType.startsWith("video/")
        ? "video"
        : "text";
    return { mediaUrl: presign.publicUrl, contentType };
  }, []);

  const searchAdminUsers = useCallback(async (q: string) => {
    if (!tokenRef.current || !bootstrapReadyRef.current)
      return [] as AdminUserResult[];
    const query = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) query.set("q", trimmed);
    query.set("limit", "30");
    const res = await apiRequest<{ users?: AdminUserResult[] }>(
      `/admin/users?${query.toString()}`,
      {
        token: tokenRef.current,
        suppressStatusCodes: [403],
        skipCache: true,
      },
    );
    return Array.isArray(res?.users) ? res.users : [];
  }, []);

  const loadGroupMembers = useCallback(async (groupId: number) => {
    if (!tokenRef.current || !bootstrapReadyRef.current) return;
    setGroupMembersLoading(true);
    setGroupMembersError(null);
    try {
      const res = await apiRequest<{ members?: GroupMember[] }>(
        `/chat/groups/${groupId}/members`,
        {
          token: tokenRef.current,
          suppressStatusCodes: [401, 403],
          skipCache: true,
        },
      );
      setGroupMembers(Array.isArray(res?.members) ? res.members : []);
    } catch (e) {
      setGroupMembersError(
        e instanceof Error ? e.message : "Failed to load members",
      );
      setGroupMembers([]);
    } finally {
      setGroupMembersLoading(false);
    }
  }, []);

  const headerTabs = useMemo(
    () => [
      { key: "announcement" as const, label: "Announcement" },
      { key: "inbox" as const, label: "Inbox" },
      { key: "teams" as const, label: "Teams" },
      { key: "stats" as const, label: "Stats" },
    ],
    [],
  );

  const loadDmThreads = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setDmLoading(true);
      setDmError(null);
      try {
        const q = dmQuery.trim();
        const query = new URLSearchParams();
        if (q) query.set("q", q);
        query.set("limit", "80");

        const res = await apiRequest<{ threads?: AdminDmThread[] }>(
          `/admin/messages/threads?${query.toString()}`,
          {
            token,
            skipCache: forceRefresh,
            forceRefresh,
            suppressStatusCodes: [403],
          },
        );
        setDmThreads(Array.isArray(res?.threads) ? res.threads : []);
      } catch (e) {
        setDmError(e instanceof Error ? e.message : "Failed to load inbox");
        setDmThreads([]);
      } finally {
        setDmLoading(false);
      }
    },
    [bootstrapReady, dmQuery, token],
  );

  const loadGroups = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const q = groupQuery.trim();
        const query = new URLSearchParams();
        if (q) query.set("q", q);
        query.set("limit", "100");

        const res = await apiRequest<{ groups?: ChatGroup[] }>(
          `/chat/groups?${query.toString()}`,
          {
            token,
            skipCache: forceRefresh,
            forceRefresh,
            suppressStatusCodes: [401, 403],
          },
        );
        setGroups(Array.isArray(res?.groups) ? res.groups : []);
      } catch (e) {
        setGroupsError(
          e instanceof Error ? e.message : "Failed to load groups",
        );
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    },
    [bootstrapReady, groupQuery, token],
  );

  useEffect(() => {
    if (!token || !bootstrapReady) return;
    if (activeTab !== "inbox") return;

    if (dmQueryDebounceRef.current) clearTimeout(dmQueryDebounceRef.current);
    dmQueryDebounceRef.current = setTimeout(() => {
      void loadDmThreads(false);
    }, 250);
    return () => {
      if (dmQueryDebounceRef.current) clearTimeout(dmQueryDebounceRef.current);
    };
  }, [activeTab, bootstrapReady, dmQuery, loadDmThreads, token]);

  useEffect(() => {
    if (!token || !bootstrapReady) return;
    if (activeTab !== "announcement" && activeTab !== "teams") return;

    if (groupQueryDebounceRef.current)
      clearTimeout(groupQueryDebounceRef.current);
    groupQueryDebounceRef.current = setTimeout(() => {
      void loadGroups(false);
    }, 250);
    return () => {
      if (groupQueryDebounceRef.current)
        clearTimeout(groupQueryDebounceRef.current);
    };
  }, [activeTab, bootstrapReady, groupQuery, loadGroups, token]);

  useEffect(() => {
    if (!token || !bootstrapReady) return;
    // First load for the default tab
    void loadDmThreads(false);
  }, [bootstrapReady, loadDmThreads, token]);

  const filteredAnnouncementGroups = useMemo(() => {
    return groups.filter(
      (g) => (g.category ?? "").toLowerCase() === "announcement",
    );
  }, [groups]);

  const filteredTeamGroups = useMemo(() => {
    return groups.filter((g) => {
      const cat = (g.category ?? "").toLowerCase();
      return cat === "team" || cat === "coach_group";
    });
  }, [groups]);

  const dmUnreadTotal = useMemo(() => {
    return dmThreads.reduce((sum, t) => sum + safeNumber(t.unread, 0), 0);
  }, [dmThreads]);

  const groupUnreadTotal = useMemo(() => {
    return groups.reduce((sum, g) => sum + safeNumber(g.unreadCount, 0), 0);
  }, [groups]);

  const stats = useMemo(
    () => ({
      directThreads: dmThreads.length,
      directUnread: dmUnreadTotal,
      groups: groups.length,
      groupUnread: groupUnreadTotal,
      announcementGroups: filteredAnnouncementGroups.length,
      teamGroups: filteredTeamGroups.length,
    }),
    [
      dmThreads.length,
      dmUnreadTotal,
      filteredAnnouncementGroups.length,
      filteredTeamGroups.length,
      groupUnreadTotal,
      groups.length,
    ],
  );

  const openDmThread = useCallback(
    async (thread: AdminDmThread) => {
      const userId = safeNumber(thread.userId, NaN);
      if (!token || !bootstrapReady) return;
      if (!Number.isFinite(userId) || userId <= 0) return;

      setActiveDmUserId(userId);
      setActiveDmName(String(thread.name ?? `User ${userId}`));
      setDmDraft("");
      setDmPendingAttachment(null);
      setDmVideoUploadId(null);
      setDmMessages([]);
      setDmThreadError(null);
      setDmThreadLoading(true);

      try {
        const res = await apiRequest<{ messages?: DirectMessage[] }>(
          `/admin/messages/${userId}`,
          {
            token,
            skipCache: true,
            suppressStatusCodes: [403],
          },
        );
        setDmMessages(Array.isArray(res?.messages) ? res.messages : []);

        // Best-effort mark read
        await apiRequest(`/admin/messages/${userId}/read`, {
          token,
          method: "POST",
          suppressStatusCodes: [403, 404],
          skipCache: true,
        });

        setDmThreads((prev) =>
          prev.map((t) => (t.userId === userId ? { ...t, unread: 0 } : t)),
        );
      } catch (e) {
        setDmThreadError(
          e instanceof Error ? e.message : "Failed to load conversation",
        );
        setDmMessages([]);
      } finally {
        setDmThreadLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  const sendDm = useCallback(async () => {
    const userId = activeDmUserId;
    const content = dmDraft.trim();
    if (!token || !bootstrapReady) return;
    if (!userId) return;
    if (dmSending) return;

    const attachmentToSend = dmPendingAttachment;
    if (!content && !attachmentToSend) return;

    const nowIso = new Date().toISOString();
    const clientId = `client-${Date.now()}`;

    // Clear immediately for snappy UX.
    setDmDraft("");
    setDmPendingAttachment(null);

    setDmSending(true);
    try {
      const optimistic: DirectMessage = {
        id: -1,
        clientId,
        senderId: safeNumber(myUserIdRef.current, 0),
        receiverId: userId,
        content: content || (attachmentToSend ? "Attachment" : ""),
        contentType: attachmentToSend
          ? attachmentToSend.mimeType.startsWith("image/")
            ? "image"
            : attachmentToSend.mimeType.startsWith("video/")
              ? "video"
              : "text"
          : "text",
        mediaUrl: null,
        videoUploadId: dmVideoUploadId,
        createdAt: nowIso,
        read: true,
      };

      setDmMessages((prev) => [...prev, optimistic]);
      setDmThreads((prev) =>
        prev.map((t) =>
          t.userId === userId
            ? {
                ...t,
                preview: content || "Attachment",
                time: nowIso,
                unread: 0,
              }
            : t,
        ),
      );

      let upload: {
        mediaUrl: string;
        contentType: "text" | "image" | "video";
      } | null = null;
      if (attachmentToSend) {
        setDmIsUploadingAttachment(true);
        upload = await uploadAttachment(attachmentToSend);
      }

      const res = await apiRequest<{ message?: DirectMessage }>(
        `/admin/messages/${userId}`,
        {
          token,
          method: "POST",
          body: {
            content: content || (attachmentToSend ? "Attachment" : ""),
            contentType: upload?.contentType ?? "text",
            mediaUrl: upload?.mediaUrl,
            videoUploadId: dmVideoUploadId ?? undefined,
            clientId,
          },
          suppressStatusCodes: [403],
          skipCache: true,
        },
      );

      const message = res?.message;
      if (message) {
        setDmMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.clientId !== clientId);
          return [...withoutTemp, message];
        });
      }
    } catch (e) {
      setDmDraft(content);
      setDmPendingAttachment(attachmentToSend);
      setDmMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      setDmThreadError(
        e instanceof Error ? e.message : "Failed to send message",
      );
    } finally {
      setDmSending(false);
      setDmIsUploadingAttachment(false);
    }
  }, [
    activeDmUserId,
    bootstrapReady,
    dmDraft,
    dmPendingAttachment,
    dmSending,
    dmVideoUploadId,
    token,
    uploadAttachment,
  ]);

  const sendDmGif = useCallback(
    async (gifUrl: string) => {
      const userId = activeDmUserId;
      if (!token || !bootstrapReady || !userId || !gifUrl || dmSending) return;
      const caption = dmDraft.trim();
      setDmDraft("");
      setDmPendingAttachment(null);
      setDmSending(true);
      try {
        const res = await apiRequest<{ message?: DirectMessage }>(
          `/admin/messages/${userId}`,
          {
            token,
            method: "POST",
            body: {
              content: caption || "GIF",
              contentType: "image",
              mediaUrl: gifUrl,
              videoUploadId: dmVideoUploadId ?? undefined,
            },
            suppressStatusCodes: [403],
            skipCache: true,
          },
        );
        if (res?.message) {
          setDmMessages((prev) => [...prev, res.message!]);
        }
      } catch (e) {
        setDmDraft(caption);
        setDmThreadError(e instanceof Error ? e.message : "Failed to send GIF");
      } finally {
        setDmSending(false);
      }
    },
    [
      activeDmUserId,
      bootstrapReady,
      dmDraft,
      dmSending,
      dmVideoUploadId,
      token,
    ],
  );

  const closeDmModal = useCallback(() => {
    setActiveDmUserId(null);
    setActiveDmName("");
    setDmMessages([]);
    setDmThreadError(null);
    setDmThreadLoading(false);
    setDmDraft("");
    setDmPendingAttachment(null);
    setDmComposerMenuOpen(false);
    setDmGifPickerOpen(false);
    setDmEmojiPickerOpen(false);
    setDmVideoUploadId(null);
  }, []);

  const openGroupThread = useCallback(
    async (group: ChatGroup) => {
      const groupId = safeNumber(group.id, NaN);
      if (!token || !bootstrapReady) return;
      if (!Number.isFinite(groupId) || groupId <= 0) return;

      setActiveGroupId(groupId);
      setActiveGroupName(String(group.name ?? `Group ${groupId}`));
      setGroupDraft("");
      setGroupPendingAttachment(null);
      setGroupMessages([]);
      setGroupThreadError(null);
      setGroupThreadLoading(true);

      try {
        const res = await apiRequest<{ messages?: GroupMessage[] }>(
          `/chat/groups/${groupId}/messages`,
          {
            token,
            skipCache: true,
            suppressStatusCodes: [401, 403],
          },
        );
        setGroupMessages(Array.isArray(res?.messages) ? res.messages : []);

        // Best-effort mark read
        await apiRequest(`/chat/groups/${groupId}/read`, {
          token,
          method: "POST",
          skipCache: true,
          suppressStatusCodes: [401, 403, 404],
        });

        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g)),
        );
      } catch (e) {
        setGroupThreadError(
          e instanceof Error ? e.message : "Failed to load group chat",
        );
        setGroupMessages([]);
      } finally {
        setGroupThreadLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  const sendGroup = useCallback(async () => {
    const groupId = activeGroupId;
    const content = groupDraft.trim();
    if (!token || !bootstrapReady) return;
    if (!groupId) return;
    if (groupSending) return;

    const attachmentToSend = groupPendingAttachment;
    if (!content && !attachmentToSend) return;

    const nowIso = new Date().toISOString();
    const clientId = `client-${Date.now()}`;

    setGroupDraft("");
    setGroupPendingAttachment(null);

    setGroupSending(true);
    try {
      const optimistic: GroupMessage = {
        id: -1,
        clientId,
        groupId,
        senderId: safeNumber(myUserIdRef.current, 0),
        content: content || (attachmentToSend ? "Attachment" : ""),
        contentType: attachmentToSend
          ? attachmentToSend.mimeType.startsWith("image/")
            ? "image"
            : attachmentToSend.mimeType.startsWith("video/")
              ? "video"
              : "text"
          : "text",
        mediaUrl: null,
        createdAt: nowIso,
      };
      setGroupMessages((prev) => [...prev, optimistic]);

      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                lastMessage: {
                  content: content || "Attachment",
                  createdAt: nowIso,
                },
                unreadCount: 0,
              }
            : g,
        ),
      );

      let upload: {
        mediaUrl: string;
        contentType: "text" | "image" | "video";
      } | null = null;
      if (attachmentToSend) {
        setGroupIsUploadingAttachment(true);
        upload = await uploadAttachment(attachmentToSend);
      }

      const res = await apiRequest<{ message?: GroupMessage }>(
        `/chat/groups/${groupId}/messages`,
        {
          token,
          method: "POST",
          body: {
            content: content || (attachmentToSend ? "Attachment" : ""),
            contentType: upload?.contentType ?? "text",
            mediaUrl: upload?.mediaUrl,
            clientId,
          },
          skipCache: true,
          suppressStatusCodes: [401, 403],
        },
      );
      const message = res?.message;
      if (message) {
        setGroupMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.clientId !== clientId);
          return [...withoutTemp, message];
        });
      }
    } catch (e) {
      setGroupDraft(content);
      setGroupPendingAttachment(attachmentToSend);
      setGroupMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to send message",
      );
    } finally {
      setGroupSending(false);
      setGroupIsUploadingAttachment(false);
    }
  }, [
    activeGroupId,
    bootstrapReady,
    groupDraft,
    groupPendingAttachment,
    groupSending,
    token,
    uploadAttachment,
  ]);

  const sendGroupGif = useCallback(
    async (gifUrl: string) => {
      const groupId = activeGroupId;
      if (!token || !bootstrapReady || !groupId || !gifUrl || groupSending)
        return;
      const caption = groupDraft.trim();
      setGroupDraft("");
      setGroupPendingAttachment(null);
      setGroupSending(true);
      try {
        const res = await apiRequest<{ message?: GroupMessage }>(
          `/chat/groups/${groupId}/messages`,
          {
            token,
            method: "POST",
            body: {
              content: caption || "GIF",
              contentType: "image",
              mediaUrl: gifUrl,
            },
            skipCache: true,
            suppressStatusCodes: [401, 403],
          },
        );
        if (res?.message) {
          setGroupMessages((prev) => [...prev, res.message!]);
        }
      } catch (e) {
        setGroupDraft(caption);
        setGroupThreadError(
          e instanceof Error ? e.message : "Failed to send GIF",
        );
      } finally {
        setGroupSending(false);
      }
    },
    [activeGroupId, bootstrapReady, groupDraft, groupSending, token],
  );

  const closeGroupModal = useCallback(() => {
    setActiveGroupId(null);
    setActiveGroupName("");
    setGroupMessages([]);
    setGroupThreadError(null);
    setGroupThreadLoading(false);
    setGroupDraft("");
    setGroupPendingAttachment(null);
    setGroupComposerMenuOpen(false);
    setGroupGifPickerOpen(false);
    setGroupEmojiPickerOpen(false);
    setGroupMembersOpen(false);
    setGroupMembers([]);
    setGroupMembersError(null);
    setGroupMembersLoading(false);
  }, []);

  // =============== Attachment pickers (DM) ===============
  const dmAttachImage = useCallback(async () => {
    if (!activeDmUserId || !token || !bootstrapReady || dmIsUploadingAttachment)
      return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setDmPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (e) {
      setDmThreadError(
        e instanceof Error ? e.message : "Failed to attach image",
      );
    } finally {
      setDmComposerMenuOpen(false);
    }
  }, [activeDmUserId, bootstrapReady, dmIsUploadingAttachment, token]);

  const dmAttachVideo = useCallback(async () => {
    if (!activeDmUserId || !token || !bootstrapReady || dmIsUploadingAttachment)
      return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setDmPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (e) {
      setDmThreadError(
        e instanceof Error ? e.message : "Failed to attach video",
      );
    } finally {
      setDmComposerMenuOpen(false);
    }
  }, [activeDmUserId, bootstrapReady, dmIsUploadingAttachment, token]);

  const dmTakePhoto = useCallback(async () => {
    if (!activeDmUserId || !token || !bootstrapReady || dmIsUploadingAttachment)
      return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setDmPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (e) {
      setDmThreadError(e instanceof Error ? e.message : "Failed to take photo");
    } finally {
      setDmComposerMenuOpen(false);
    }
  }, [activeDmUserId, bootstrapReady, dmIsUploadingAttachment, token]);

  const dmRecordVideo = useCallback(async () => {
    if (!activeDmUserId || !token || !bootstrapReady || dmIsUploadingAttachment)
      return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setDmPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (e) {
      setDmThreadError(
        e instanceof Error ? e.message : "Failed to record video",
      );
    } finally {
      setDmComposerMenuOpen(false);
    }
  }, [activeDmUserId, bootstrapReady, dmIsUploadingAttachment, token]);

  const dmAttachFile = useCallback(async () => {
    if (!activeDmUserId || !token || !bootstrapReady || dmIsUploadingAttachment)
      return;
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "application/octet-stream";
      setDmPendingAttachment({
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType,
        sizeBytes: asset.size ?? 512000,
        isImage: mimeType.startsWith("image/"),
      });
    } catch (e) {
      setDmThreadError(
        e instanceof Error ? e.message : "Failed to attach file",
      );
    } finally {
      setDmComposerMenuOpen(false);
    }
  }, [activeDmUserId, bootstrapReady, dmIsUploadingAttachment, token]);

  // =============== Attachment pickers (Group) ===============
  const groupAttachImage = useCallback(async () => {
    if (
      !activeGroupId ||
      !token ||
      !bootstrapReady ||
      groupIsUploadingAttachment
    )
      return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setGroupPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (e) {
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to attach image",
      );
    } finally {
      setGroupComposerMenuOpen(false);
    }
  }, [activeGroupId, bootstrapReady, groupIsUploadingAttachment, token]);

  const groupAttachVideo = useCallback(async () => {
    if (
      !activeGroupId ||
      !token ||
      !bootstrapReady ||
      groupIsUploadingAttachment
    )
      return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setGroupPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (e) {
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to attach video",
      );
    } finally {
      setGroupComposerMenuOpen(false);
    }
  }, [activeGroupId, bootstrapReady, groupIsUploadingAttachment, token]);

  const groupTakePhoto = useCallback(async () => {
    if (
      !activeGroupId ||
      !token ||
      !bootstrapReady ||
      groupIsUploadingAttachment
    )
      return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      setGroupPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: asset.fileSize ?? 512000,
        isImage: true,
      });
    } catch (e) {
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to take photo",
      );
    } finally {
      setGroupComposerMenuOpen(false);
    }
  }, [activeGroupId, bootstrapReady, groupIsUploadingAttachment, token]);

  const groupRecordVideo = useCallback(async () => {
    if (
      !activeGroupId ||
      !token ||
      !bootstrapReady ||
      groupIsUploadingAttachment
    )
      return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      setGroupPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: asset.fileSize ?? 2000000,
        isImage: false,
      });
    } catch (e) {
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to record video",
      );
    } finally {
      setGroupComposerMenuOpen(false);
    }
  }, [activeGroupId, bootstrapReady, groupIsUploadingAttachment, token]);

  const groupAttachFile = useCallback(async () => {
    if (
      !activeGroupId ||
      !token ||
      !bootstrapReady ||
      groupIsUploadingAttachment
    )
      return;
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "application/octet-stream";
      setGroupPendingAttachment({
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType,
        sizeBytes: asset.size ?? 512000,
        isImage: mimeType.startsWith("image/"),
      });
    } catch (e) {
      setGroupThreadError(
        e instanceof Error ? e.message : "Failed to attach file",
      );
    } finally {
      setGroupComposerMenuOpen(false);
    }
  }, [activeGroupId, bootstrapReady, groupIsUploadingAttachment, token]);

  // =============== Realtime updates (threads / unread) ===============
  useEffect(() => {
    if (!socket) return;
    if (!tokenRef.current || !bootstrapReadyRef.current) return;
    if (!myUserIdRef.current) return;

    const myId = String(myUserIdRef.current);

    const handleDirect = (payload: any) => {
      if (!payload?.id) return;
      const senderId = String(payload.senderId ?? "");
      const receiverId = String(payload.receiverId ?? "");
      if (!senderId || !receiverId) return;

      const otherUserId = safeNumber(
        senderId === myId ? receiverId : senderId,
        NaN,
      );
      if (!Number.isFinite(otherUserId) || otherUserId <= 0) return;

      const idNum = Number(payload.id);
      const message: DirectMessage = {
        id: Number.isFinite(idNum) ? idNum : undefined,
        clientId: payload.clientId ?? null,
        senderId: safeNumber(payload.senderId, 0),
        receiverId: safeNumber(payload.receiverId, 0),
        content: payload.content ?? payload.text ?? "",
        contentType: payload.contentType ?? "text",
        mediaUrl: payload.mediaUrl ?? null,
        videoUploadId: payload.videoUploadId ?? null,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        read: payload.read ?? null,
      };

      const isIncoming = senderId !== myId;
      const isActive = activeDmUserIdRef.current === otherUserId;

      setDmThreads((prev) => {
        const existing = prev.find((t) => t.userId === otherUserId);
        const preview =
          stripPreview(message.content) ||
          (message.mediaUrl ? "Media" : "Message");
        const nextTime = message.createdAt ?? new Date().toISOString();
        if (existing) {
          const nextUnread =
            isIncoming && !isActive
              ? safeNumber(existing.unread, 0) + 1
              : isActive
                ? 0
                : safeNumber(existing.unread, 0);
          const next = {
            ...existing,
            preview,
            time: nextTime,
            unread: nextUnread,
          };
          return [next, ...prev.filter((t) => t.userId !== otherUserId)];
        }
        const fallbackName =
          senderId === myId
            ? (payload.receiverName ?? `User ${otherUserId}`)
            : (payload.senderName ?? `User ${otherUserId}`);
        return [
          {
            userId: otherUserId,
            name: fallbackName,
            preview,
            time: nextTime,
            unread: isIncoming && !isActive ? 1 : 0,
            programTier: payload.programTier ?? null,
            premium: payload.premium ?? null,
          },
          ...prev,
        ];
      });

      if (isActive) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id && String(m.id) === String(message.id)))
            return prev;
          if (message.clientId) {
            const withoutTemp = prev.filter(
              (m) => m.clientId !== message.clientId,
            );
            return [...withoutTemp, message];
          }
          return [...prev, message];
        });

        if (isIncoming && tokenRef.current) {
          apiRequest(`/admin/messages/${otherUserId}/read`, {
            token: tokenRef.current,
            method: "POST",
            suppressStatusCodes: [403, 404],
            skipCache: true,
          })
            .then(() => {
              setDmThreads((prev) =>
                prev.map((t) =>
                  t.userId === otherUserId ? { ...t, unread: 0 } : t,
                ),
              );
            })
            .catch(() => null);
        }
      }
    };

    const handleGroup = (payload: any) => {
      if (!payload?.id || !payload?.groupId) return;
      const groupId = safeNumber(payload.groupId, NaN);
      if (!Number.isFinite(groupId) || groupId <= 0) return;

      const senderId = String(payload.senderId ?? "");
      const isIncoming = senderId !== myId;
      const isActive = activeGroupIdRef.current === groupId;
      const content = payload.content ?? "";
      const createdAt = payload.createdAt ?? new Date().toISOString();

      const idNum = Number(payload.id);
      const message: GroupMessage = {
        id: Number.isFinite(idNum) ? idNum : undefined,
        clientId: payload.clientId ?? null,
        groupId,
        senderId: safeNumber(payload.senderId, 0),
        content,
        contentType: payload.contentType ?? "text",
        mediaUrl: payload.mediaUrl ?? null,
        createdAt,
      };

      setGroups((prev) => {
        const existing = prev.find((g) => g.id === groupId);
        const nextUnread =
          isIncoming && !isActive
            ? safeNumber(existing?.unreadCount, 0) + 1
            : isActive
              ? 0
              : safeNumber(existing?.unreadCount, 0);
        const updated: ChatGroup = {
          id: groupId,
          name: existing?.name ?? payload.groupName ?? `Group ${groupId}`,
          category: existing?.category ?? payload.category ?? null,
          unreadCount: nextUnread,
          lastMessage: { content, createdAt },
        };
        if (existing) {
          return [updated, ...prev.filter((g) => g.id !== groupId)];
        }
        return [updated, ...prev];
      });

      if (isActive) {
        setGroupMessages((prev) => {
          if (prev.some((m) => m.id && String(m.id) === String(message.id)))
            return prev;
          if (message.clientId) {
            const withoutTemp = prev.filter(
              (m) => m.clientId !== message.clientId,
            );
            return [...withoutTemp, message];
          }
          return [...prev, message];
        });
        if (isIncoming && tokenRef.current) {
          apiRequest(`/chat/groups/${groupId}/read`, {
            token: tokenRef.current,
            method: "POST",
            skipCache: true,
            suppressStatusCodes: [401, 403, 404],
          })
            .then(() => {
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === groupId ? { ...g, unreadCount: 0 } : g,
                ),
              );
            })
            .catch(() => null);
        }
      }
    };

    socket.on("message:new", handleDirect);
    socket.on("group:message", handleGroup);
    return () => {
      socket.off("message:new", handleDirect);
      socket.off("group:message", handleGroup);
    };
  }, [socket]);

  // =============== User picker (search) ===============
  useEffect(() => {
    if (!userPickerOpen) return;
    let active = true;
    setUserPickerLoading(true);
    setUserPickerError(null);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const users = await searchAdminUsers(userPickerQuery);
          if (active) setUserPickerResults(users);
        } catch (e) {
          if (active) {
            setUserPickerError(
              e instanceof Error ? e.message : "Failed to search users",
            );
            setUserPickerResults([]);
          }
        } finally {
          if (active) setUserPickerLoading(false);
        }
      })();
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchAdminUsers, userPickerOpen, userPickerQuery]);

  const openUserPickerForCreate = useCallback(() => {
    userPickerModeRef.current = "create";
    setUserPickerTitle("Select members");
    setUserPickerQuery("");
    setUserPickerResults([]);
    setUserPickerError(null);
    const selected: Record<number, boolean> = {};
    for (const id of createGroupMemberIds) selected[id] = true;
    setUserPickerSelected(selected);
    setUserPickerOpen(true);
  }, [createGroupMemberIds]);

  const openUserPickerForAddMembers = useCallback(() => {
    userPickerModeRef.current = "addMembers";
    setUserPickerTitle("Add members");
    setUserPickerQuery("");
    setUserPickerResults([]);
    setUserPickerError(null);
    setUserPickerSelected({});
    setUserPickerOpen(true);
  }, []);

  const confirmUserPicker = useCallback(async () => {
    const selectedIds = Object.keys(userPickerSelected)
      .filter((k) => userPickerSelected[Number(k)])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (userPickerModeRef.current === "create") {
      setCreateGroupMemberIds(selectedIds);
      setUserPickerOpen(false);
      return;
    }

    const groupId = activeGroupIdRef.current;
    if (!groupId || !tokenRef.current) {
      setUserPickerOpen(false);
      return;
    }
    if (selectedIds.length === 0) {
      setUserPickerOpen(false);
      return;
    }

    try {
      await apiRequest(`/chat/groups/${groupId}/members`, {
        token: tokenRef.current,
        method: "POST",
        body: { memberIds: selectedIds },
        suppressStatusCodes: [401, 403],
        skipCache: true,
      });
      setUserPickerOpen(false);
      await loadGroupMembers(groupId);
    } catch (e) {
      setUserPickerError(
        e instanceof Error ? e.message : "Failed to add members",
      );
    }
  }, [loadGroupMembers, userPickerSelected]);

  const createGroupCategory = useMemo(() => {
    if (activeTab === "announcement") return "announcement" as const;
    if (activeTab === "teams") return "team" as const;
    return "coach_group" as const;
  }, [activeTab]);

  const createGroup = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    const name = createGroupName.trim();
    if (!name) return;
    if (createGroupSaving) return;
    setCreateGroupSaving(true);
    setCreateGroupError(null);
    try {
      const res = await apiRequest<{ group?: ChatGroup }>("/chat/groups", {
        token,
        method: "POST",
        body: {
          name,
          category: createGroupCategory,
          memberIds: createGroupMemberIds,
        },
        suppressStatusCodes: [401, 403],
        skipCache: true,
      });
      const group = res?.group;
      setCreateGroupOpen(false);
      setCreateGroupName("");
      setCreateGroupMemberIds([]);
      if (group?.id) {
        setGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
        void openGroupThread(group);
      } else {
        await loadGroups(true);
      }
    } catch (e) {
      setCreateGroupError(
        e instanceof Error ? e.message : "Failed to create group",
      );
    } finally {
      setCreateGroupSaving(false);
    }
  }, [
    bootstrapReady,
    createGroupCategory,
    createGroupMemberIds,
    createGroupName,
    createGroupSaving,
    loadGroups,
    openGroupThread,
    token,
  ]);

  const cardStyle = useMemo(
    () => ({
      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      ...(isDark ? Shadows.none : Shadows.md),
    }),
    [colors.cardElevated, isDark],
  );

  const headerLine = useMemo(() => {
    if (activeTab === "inbox") {
      if (dmLoading) return "Loading…";
      if (dmError) return "Error";
      return `${dmThreads.length} threads • ${dmUnreadTotal} unread`;
    }
    if (activeTab === "announcement") {
      if (groupsLoading) return "Loading…";
      if (groupsError) return "Error";
      return `${filteredAnnouncementGroups.length} groups`;
    }
    if (activeTab === "teams") {
      if (groupsLoading) return "Loading…";
      if (groupsError) return "Error";
      return `${filteredTeamGroups.length} groups`;
    }
    return "";
  }, [
    activeTab,
    dmError,
    dmLoading,
    dmThreads.length,
    dmUnreadTotal,
    filteredAnnouncementGroups.length,
    filteredTeamGroups.length,
    groupsError,
    groupsLoading,
  ]);

  const headerSearch = useMemo(() => {
    const placeholder =
      activeTab === "inbox"
        ? "Search inbox…"
        : activeTab === "announcement"
          ? "Search announcements…"
          : activeTab === "teams"
            ? "Search teams…"
            : "";

    if (activeTab === "stats") return null;

    const value = activeTab === "inbox" ? dmQuery : groupQuery;
    const onChange = activeTab === "inbox" ? setDmQuery : setGroupQuery;
    const onSubmit =
      activeTab === "inbox"
        ? (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
            event.preventDefault?.();
            void loadDmThreads(true);
          }
        : (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
            event.preventDefault?.();
            void loadGroups(true);
          };

    return (
      <View
        className="mt-4 rounded-full border px-4 py-2 flex-row items-center gap-2"
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: "Outfit",
            fontSize: 14,
            paddingVertical: 0,
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    );
  }, [
    activeTab,
    colors.backgroundSecondary,
    colors.border,
    colors.text,
    colors.textSecondary,
    dmQuery,
    groupQuery,
    loadDmThreads,
    loadGroups,
  ]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={async () => {
          if (activeTab === "inbox") {
            await loadDmThreads(true);
            return;
          }
          if (activeTab === "announcement" || activeTab === "teams") {
            await loadGroups(true);
            return;
          }
        }}
      >
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Messages
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {headerLine}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row">
            <View
              className="flex-1 rounded-full border p-1 flex-row"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              {headerTabs.map((tab) => {
                const active = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    className="flex-1 px-3 py-2 rounded-full"
                    style={({ pressed }) => ({
                      backgroundColor: active ? colors.tint : "transparent",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text
                      className="text-[12px] font-outfit font-semibold text-center"
                      style={{
                        color: active ? "#FFFFFF" : colors.textSecondary,
                      }}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {headerSearch}
        </View>

        {/* ============== ANNOUNCEMENTS ============== */}
        {activeTab === "announcement" ? (
          <View className="rounded-[28px] border p-5" style={cardStyle}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[12px] font-outfit text-secondary">
                Announcement groups
              </Text>
              <Pressable
                onPress={() => {
                  setCreateGroupError(null);
                  setCreateGroupName("");
                  setCreateGroupMemberIds([]);
                  setCreateGroupOpen(true);
                }}
                className="px-3 py-2 rounded-full flex-row items-center gap-2"
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.backgroundSecondary
                    : "transparent",
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                <Ionicons name="add" size={16} color={colors.text} />
                <Text
                  className="text-[12px] font-outfit font-semibold"
                  style={{ color: colors.text }}
                >
                  Create
                </Text>
              </Pressable>
            </View>
            {groupsLoading && filteredAnnouncementGroups.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                Loading…
              </Text>
            ) : groupsError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {groupsError}
              </Text>
            ) : filteredAnnouncementGroups.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No announcement groups.
              </Text>
            ) : (
              <View className="gap-3">
                {filteredAnnouncementGroups.map((g) => {
                  const unread = safeNumber(g.unreadCount, 0);
                  const preview = stripPreview(g.lastMessage?.content ?? "");
                  return (
                    <Pressable
                      key={String(g.id)}
                      onPress={() => void openGroupThread(g)}
                      className="rounded-2xl border px-4 py-3"
                      style={({ pressed }) => ({
                        borderColor: colors.border,
                        backgroundColor: pressed
                          ? colors.backgroundSecondary
                          : "transparent",
                      })}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className="text-[16px] font-outfit font-semibold text-app"
                            numberOfLines={1}
                          >
                            {String(g.name ?? `Group ${g.id}`)}
                          </Text>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={2}
                          >
                            {preview || "Open to view messages"}
                          </Text>
                        </View>
                        {unread > 0 ? (
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: colors.tint }}
                          >
                            <Text className="text-[12px] font-outfit font-semibold text-white">
                              {unread}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* ============== INBOX ============== */}
        {activeTab === "inbox" ? (
          <View className="rounded-[28px] border p-5" style={cardStyle}>
            {dmLoading && dmThreads.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                Loading…
              </Text>
            ) : dmError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {dmError}
              </Text>
            ) : dmThreads.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No conversations yet.
              </Text>
            ) : (
              <View className="gap-3">
                {dmThreads.map((t) => {
                  const unread = safeNumber(t.unread, 0);
                  const preview = stripPreview(t.preview);
                  return (
                    <Pressable
                      key={String(t.userId)}
                      onPress={() => void openDmThread(t)}
                      className="rounded-2xl border px-4 py-3"
                      style={({ pressed }) => ({
                        borderColor: colors.border,
                        backgroundColor: pressed
                          ? colors.backgroundSecondary
                          : "transparent",
                      })}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className="text-[16px] font-outfit font-semibold text-app"
                            numberOfLines={1}
                          >
                            {String(t.name ?? `User ${t.userId}`)}
                          </Text>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={2}
                          >
                            {preview || "Start the conversation"}
                          </Text>
                          <Text
                            className="text-[11px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {formatWhen(t.time)}
                            {t.programTier ? ` • ${t.programTier}` : ""}
                          </Text>
                        </View>
                        {unread > 0 ? (
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: colors.tint }}
                          >
                            <Text className="text-[12px] font-outfit font-semibold text-white">
                              {unread}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* ============== TEAMS ============== */}
        {activeTab === "teams" ? (
          <View className="rounded-[28px] border p-5" style={cardStyle}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[12px] font-outfit text-secondary">
                Team groups
              </Text>
              <Pressable
                onPress={() => {
                  setCreateGroupError(null);
                  setCreateGroupName("");
                  setCreateGroupMemberIds([]);
                  setCreateGroupOpen(true);
                }}
                className="px-3 py-2 rounded-full flex-row items-center gap-2"
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.backgroundSecondary
                    : "transparent",
                  borderWidth: 1,
                  borderColor: colors.border,
                })}
              >
                <Ionicons name="add" size={16} color={colors.text} />
                <Text
                  className="text-[12px] font-outfit font-semibold"
                  style={{ color: colors.text }}
                >
                  Create
                </Text>
              </Pressable>
            </View>
            {groupsLoading && filteredTeamGroups.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                Loading…
              </Text>
            ) : groupsError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {groupsError}
              </Text>
            ) : filteredTeamGroups.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No team groups.
              </Text>
            ) : (
              <View className="gap-3">
                {filteredTeamGroups.map((g) => {
                  const unread = safeNumber(g.unreadCount, 0);
                  const preview = stripPreview(g.lastMessage?.content ?? "");
                  const label = categoryLabel(g.category);
                  return (
                    <Pressable
                      key={String(g.id)}
                      onPress={() => void openGroupThread(g)}
                      className="rounded-2xl border px-4 py-3"
                      style={({ pressed }) => ({
                        borderColor: colors.border,
                        backgroundColor: pressed
                          ? colors.backgroundSecondary
                          : "transparent",
                      })}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className="text-[16px] font-outfit font-semibold text-app"
                            numberOfLines={1}
                          >
                            {String(g.name ?? `Group ${g.id}`)}
                          </Text>
                          <Text
                            className="text-[11px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={2}
                          >
                            {preview || "Open to view messages"}
                          </Text>
                        </View>
                        {unread > 0 ? (
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: colors.tint }}
                          >
                            <Text className="text-[12px] font-outfit font-semibold text-white">
                              {unread}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* ============== STATS ============== */}
        {activeTab === "stats" ? (
          <View className="rounded-[28px] border p-5" style={cardStyle}>
            <View className="gap-3">
              <View
                className="rounded-2xl border px-4 py-3"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-[12px] font-outfit text-secondary">
                  Inbox
                </Text>
                <Text className="text-[18px] font-outfit font-semibold text-app">
                  {stats.directThreads} threads • {stats.directUnread} unread
                </Text>
              </View>
              <View
                className="rounded-2xl border px-4 py-3"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-[12px] font-outfit text-secondary">
                  Groups
                </Text>
                <Text className="text-[18px] font-outfit font-semibold text-app">
                  {stats.groups} groups • {stats.groupUnread} unread
                </Text>
                <Text className="text-[12px] font-outfit text-secondary">
                  {stats.announcementGroups} announcement • {stats.teamGroups}{" "}
                  team
                </Text>
              </View>
              <Text className="text-[12px] font-outfit text-secondary">
                Stats are derived from the lists loaded in this screen.
              </Text>
            </View>
          </View>
        ) : null}
      </ThemedScrollView>

      {/* ================= DM MODAL ================= */}
      <Modal
        visible={activeDmUserId != null}
        animationType="slide"
        onRequestClose={closeDmModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Pressable
              onPress={closeDmModal}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-[16px] font-outfit font-semibold text-app"
                numberOfLines={1}
              >
                {activeDmName}
              </Text>
              <Text
                className="text-[11px] font-outfit text-secondary"
                numberOfLines={1}
              >
                Admin Inbox
              </Text>
            </View>
            <View className="w-10" />
          </View>

          <ThemedScrollView
            onRefresh={async () => {
              const userId = activeDmUserId;
              if (!token || !bootstrapReady || !userId) return;
              setDmThreadLoading(true);
              setDmThreadError(null);
              try {
                const res = await apiRequest<{ messages?: DirectMessage[] }>(
                  `/admin/messages/${userId}`,
                  { token, skipCache: true, suppressStatusCodes: [403] },
                );
                setDmMessages(Array.isArray(res?.messages) ? res.messages : []);
              } catch (e) {
                setDmThreadError(
                  e instanceof Error ? e.message : "Failed to refresh",
                );
              } finally {
                setDmThreadLoading(false);
              }
            }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 140,
            }}
          >
            {dmThreadLoading && dmMessages.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                Loading…
              </Text>
            ) : dmThreadError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {dmThreadError}
              </Text>
            ) : dmMessages.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No messages yet.
              </Text>
            ) : (
              <View className="gap-2">
                {dmMessages.map((m, idx) => {
                  const inbound =
                    safeNumber(m.senderId, 0) === safeNumber(activeDmUserId, 0);
                  const bubbleBg = inbound
                    ? colors.backgroundSecondary
                    : colors.tint;
                  const bubbleText = inbound ? colors.text : "#FFFFFF";
                  const content = stripPreview(m.content);
                  const meta = formatWhen(m.createdAt);
                  const contentType = String(
                    m.contentType ?? "text",
                  ).toLowerCase();
                  const isImage =
                    Boolean(m.mediaUrl) && contentType === "image";
                  const isVideo =
                    Boolean(m.mediaUrl) && contentType === "video";

                  return (
                    <Pressable
                      key={String(m.id ?? m.clientId ?? idx)}
                      onPress={() => {
                        const vid = safeNumber(m.videoUploadId, NaN);
                        if (Number.isFinite(vid) && vid > 0) {
                          setDmVideoUploadId(vid);
                        }
                      }}
                      className="w-full"
                      style={({ pressed }) => ({
                        alignItems: inbound ? "flex-start" : "flex-end",
                        opacity: pressed ? 0.98 : 1,
                      })}
                    >
                      <View
                        className="max-w-[88%] rounded-2xl px-4 py-3"
                        style={{ backgroundColor: bubbleBg }}
                      >
                        {content ? (
                          <Text
                            className="text-[14px] font-outfit"
                            style={{ color: bubbleText }}
                          >
                            {content}
                          </Text>
                        ) : null}

                        {isImage && m.mediaUrl ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <ExpoImage
                              source={{ uri: String(m.mediaUrl) }}
                              style={{
                                width: 240,
                                height: 180,
                                borderRadius: 14,
                                marginTop: content ? 8 : 0,
                              }}
                              contentFit="cover"
                            />
                          </Pressable>
                        ) : null}

                        {isVideo && m.mediaUrl ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            className="mt-2 flex-row items-center gap-2"
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <Ionicons
                              name="play-circle"
                              size={18}
                              color={bubbleText}
                            />
                            <Text
                              className="text-[12px] font-outfit"
                              style={{ color: bubbleText, opacity: 0.9 }}
                            >
                              Open video
                            </Text>
                          </Pressable>
                        ) : null}

                        {m.mediaUrl && !isImage && !isVideo ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <Text
                              selectable
                              className="text-[11px] font-outfit"
                              style={{ color: bubbleText, opacity: 0.85 }}
                            >
                              {String(m.mediaUrl)}
                            </Text>
                          </Pressable>
                        ) : null}

                        {m.videoUploadId ? (
                          <Text
                            className="text-[10px] font-outfit"
                            style={{
                              color: bubbleText,
                              opacity: 0.75,
                              marginTop: 6,
                            }}
                          >
                            Video feedback ID: {safeNumber(m.videoUploadId, 0)}
                          </Text>
                        ) : null}
                        {meta ? (
                          <Text
                            className="text-[10px] font-outfit"
                            style={{ color: bubbleText, opacity: 0.75 }}
                          >
                            {meta}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ThemedScrollView>

          <View
            className="absolute left-0 right-0"
            style={{
              bottom: 0,
              paddingBottom: insets.bottom,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {dmVideoUploadId ? (
              <View className="px-4 pt-3">
                <View
                  className="rounded-2xl border px-3 py-2 flex-row items-center justify-between"
                  style={{
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                  >
                    Video feedback: {dmVideoUploadId}
                  </Text>
                  <Pressable
                    onPress={() => setDmVideoUploadId(null)}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.border : "transparent",
                    })}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {dmPendingAttachment ? (
              <View className="px-4 pt-3">
                <View
                  className="rounded-2xl border px-3 py-2 flex-row items-center justify-between"
                  style={{
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                  >
                    Attachment: {dmPendingAttachment.fileName}
                  </Text>
                  <Pressable
                    onPress={() => setDmPendingAttachment(null)}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.border : "transparent",
                    })}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View className="px-4 py-3 flex-row items-end gap-2">
              <Pressable
                onPress={() => setDmComposerMenuOpen(true)}
                disabled={dmIsUploadingAttachment}
                className="w-11 h-11 items-center justify-center rounded-2xl border"
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.backgroundSecondary
                    : colors.background,
                  borderColor: colors.border,
                  opacity: dmIsUploadingAttachment ? 0.6 : 1,
                })}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
              <View
                className="flex-1 rounded-2xl border px-3 py-2"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                }}
              >
                <TextInput
                  value={dmDraft}
                  onChangeText={setDmDraft}
                  placeholder="Type a message…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={{
                    minHeight: 38,
                    maxHeight: 110,
                    color: colors.text,
                    fontFamily: "Outfit",
                    fontSize: 14,
                  }}
                />
              </View>
              <Pressable
                onPress={() => void sendDm()}
                disabled={
                  (!dmDraft.trim() && !dmPendingAttachment) ||
                  dmSending ||
                  dmIsUploadingAttachment
                }
                className="rounded-2xl px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor:
                    (!dmDraft.trim() && !dmPendingAttachment) ||
                    dmSending ||
                    dmIsUploadingAttachment
                      ? isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(15,23,42,0.08)"
                      : colors.tint,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  className="text-[12px] font-outfit font-semibold"
                  style={{
                    color:
                      (!dmDraft.trim() && !dmPendingAttachment) ||
                      dmSending ||
                      dmIsUploadingAttachment
                        ? colors.textSecondary
                        : "#FFFFFF",
                  }}
                >
                  {dmIsUploadingAttachment ? "…" : dmSending ? "…" : "Send"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ComposerActionsModal
        open={dmComposerMenuOpen}
        onClose={() => setDmComposerMenuOpen(false)}
        title="Add content"
        subtitle="Share media or files"
        onAttachFile={() => void dmAttachFile()}
        onAttachImage={() => void dmAttachImage()}
        onAttachVideo={() => void dmAttachVideo()}
        onTakePhoto={() => void dmTakePhoto()}
        onRecordVideo={() => void dmRecordVideo()}
        onOpenGifs={() => setDmGifPickerOpen(true)}
        onOpenEmojis={() => setDmEmojiPickerOpen(true)}
      />
      <GifPickerModal
        open={dmGifPickerOpen}
        onClose={() => setDmGifPickerOpen(false)}
        token={token ?? null}
        onSelectGif={(url) => {
          setDmGifPickerOpen(false);
          void sendDmGif(url);
        }}
      />
      <EmojiPickerModal
        open={dmEmojiPickerOpen}
        onClose={() => setDmEmojiPickerOpen(false)}
        onSelectEmoji={(emoji) => {
          setDmEmojiPickerOpen(false);
          setDmDraft((prev) => `${prev}${emoji}`);
        }}
      />

      {/* ================= GROUP MODAL ================= */}
      <Modal
        visible={activeGroupId != null}
        animationType="slide"
        onRequestClose={closeGroupModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Pressable
              onPress={closeGroupModal}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-[16px] font-outfit font-semibold text-app"
                numberOfLines={1}
              >
                {activeGroupName}
              </Text>
              <Text
                className="text-[11px] font-outfit text-secondary"
                numberOfLines={1}
              >
                Group Chat
              </Text>
            </View>
            <Pressable
              onPress={() => {
                const gid = activeGroupId;
                if (!gid) return;
                setGroupMembersOpen(true);
                void loadGroupMembers(gid);
              }}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="people" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ThemedScrollView
            onRefresh={async () => {
              const groupId = activeGroupId;
              if (!token || !bootstrapReady || !groupId) return;
              setGroupThreadLoading(true);
              setGroupThreadError(null);
              try {
                const res = await apiRequest<{ messages?: GroupMessage[] }>(
                  `/chat/groups/${groupId}/messages`,
                  { token, skipCache: true, suppressStatusCodes: [401, 403] },
                );
                setGroupMessages(
                  Array.isArray(res?.messages) ? res.messages : [],
                );
              } catch (e) {
                setGroupThreadError(
                  e instanceof Error ? e.message : "Failed to refresh",
                );
              } finally {
                setGroupThreadLoading(false);
              }
            }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 140,
            }}
          >
            {groupThreadLoading && groupMessages.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                Loading…
              </Text>
            ) : groupThreadError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {groupThreadError}
              </Text>
            ) : groupMessages.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No messages yet.
              </Text>
            ) : (
              <View className="gap-2">
                {groupMessages.map((m, idx) => {
                  const inbound =
                    myUserId != null &&
                    safeNumber(m.senderId, 0) !== safeNumber(myUserId, -1);
                  const bubbleBg = inbound
                    ? colors.backgroundSecondary
                    : colors.tint;
                  const bubbleText = inbound ? colors.text : "#FFFFFF";
                  const content = stripPreview(m.content);
                  const meta = formatWhen(m.createdAt);
                  const contentType = String(
                    m.contentType ?? "text",
                  ).toLowerCase();
                  const isImage =
                    Boolean(m.mediaUrl) && contentType === "image";
                  const isVideo =
                    Boolean(m.mediaUrl) && contentType === "video";

                  return (
                    <View
                      key={String(m.id ?? m.clientId ?? idx)}
                      className="w-full"
                      style={{
                        alignItems: inbound ? "flex-start" : "flex-end",
                      }}
                    >
                      <View
                        className="max-w-[88%] rounded-2xl px-4 py-3"
                        style={{ backgroundColor: bubbleBg }}
                      >
                        {content ? (
                          <Text
                            className="text-[14px] font-outfit"
                            style={{ color: bubbleText }}
                          >
                            {content}
                          </Text>
                        ) : null}

                        {isImage && m.mediaUrl ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <ExpoImage
                              source={{ uri: String(m.mediaUrl) }}
                              style={{
                                width: 240,
                                height: 180,
                                borderRadius: 14,
                                marginTop: content ? 8 : 0,
                              }}
                              contentFit="cover"
                            />
                          </Pressable>
                        ) : null}

                        {isVideo && m.mediaUrl ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            className="mt-2 flex-row items-center gap-2"
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <Ionicons
                              name="play-circle"
                              size={18}
                              color={bubbleText}
                            />
                            <Text
                              className="text-[12px] font-outfit"
                              style={{ color: bubbleText, opacity: 0.9 }}
                            >
                              Open video
                            </Text>
                          </Pressable>
                        ) : null}

                        {m.mediaUrl && !isImage && !isVideo ? (
                          <Pressable
                            onPress={() =>
                              void Linking.openURL(String(m.mediaUrl))
                            }
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.9 : 1,
                            })}
                          >
                            <Text
                              selectable
                              className="text-[11px] font-outfit"
                              style={{ color: bubbleText, opacity: 0.85 }}
                            >
                              {String(m.mediaUrl)}
                            </Text>
                          </Pressable>
                        ) : null}
                        {meta ? (
                          <Text
                            className="text-[10px] font-outfit"
                            style={{ color: bubbleText, opacity: 0.75 }}
                          >
                            {meta}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ThemedScrollView>

          <View
            className="absolute left-0 right-0"
            style={{
              bottom: 0,
              paddingBottom: insets.bottom,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {groupPendingAttachment ? (
              <View className="px-4 pt-3">
                <View
                  className="rounded-2xl border px-3 py-2 flex-row items-center justify-between"
                  style={{
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                  >
                    Attachment: {groupPendingAttachment.fileName}
                  </Text>
                  <Pressable
                    onPress={() => setGroupPendingAttachment(null)}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? colors.border : "transparent",
                    })}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View className="px-4 py-3 flex-row items-end gap-2">
              <Pressable
                onPress={() => setGroupComposerMenuOpen(true)}
                disabled={groupIsUploadingAttachment}
                className="w-11 h-11 items-center justify-center rounded-2xl border"
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? colors.backgroundSecondary
                    : colors.background,
                  borderColor: colors.border,
                  opacity: groupIsUploadingAttachment ? 0.6 : 1,
                })}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
              <View
                className="flex-1 rounded-2xl border px-3 py-2"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                }}
              >
                <TextInput
                  value={groupDraft}
                  onChangeText={setGroupDraft}
                  placeholder="Type a message…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={{
                    minHeight: 38,
                    maxHeight: 110,
                    color: colors.text,
                    fontFamily: "Outfit",
                    fontSize: 14,
                  }}
                />
              </View>
              <Pressable
                onPress={() => void sendGroup()}
                disabled={
                  (!groupDraft.trim() && !groupPendingAttachment) ||
                  groupSending ||
                  groupIsUploadingAttachment
                }
                className="rounded-2xl px-4 py-3"
                style={({ pressed }) => ({
                  backgroundColor:
                    (!groupDraft.trim() && !groupPendingAttachment) ||
                    groupSending ||
                    groupIsUploadingAttachment
                      ? isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(15,23,42,0.08)"
                      : colors.tint,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  className="text-[12px] font-outfit font-semibold"
                  style={{
                    color:
                      (!groupDraft.trim() && !groupPendingAttachment) ||
                      groupSending ||
                      groupIsUploadingAttachment
                        ? colors.textSecondary
                        : "#FFFFFF",
                  }}
                >
                  {groupIsUploadingAttachment
                    ? "…"
                    : groupSending
                      ? "…"
                      : "Send"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ComposerActionsModal
        open={groupComposerMenuOpen}
        onClose={() => setGroupComposerMenuOpen(false)}
        title="Add content"
        subtitle="Share media or files"
        onAttachFile={() => void groupAttachFile()}
        onAttachImage={() => void groupAttachImage()}
        onAttachVideo={() => void groupAttachVideo()}
        onTakePhoto={() => void groupTakePhoto()}
        onRecordVideo={() => void groupRecordVideo()}
        onOpenGifs={() => setGroupGifPickerOpen(true)}
        onOpenEmojis={() => setGroupEmojiPickerOpen(true)}
      />
      <GifPickerModal
        open={groupGifPickerOpen}
        onClose={() => setGroupGifPickerOpen(false)}
        token={token ?? null}
        onSelectGif={(url) => {
          setGroupGifPickerOpen(false);
          void sendGroupGif(url);
        }}
      />
      <EmojiPickerModal
        open={groupEmojiPickerOpen}
        onClose={() => setGroupEmojiPickerOpen(false)}
        onSelectEmoji={(emoji) => {
          setGroupEmojiPickerOpen(false);
          setGroupDraft((prev) => `${prev}${emoji}`);
        }}
      />

      {/* =============== CREATE GROUP MODAL =============== */}
      <Modal
        visible={createGroupOpen}
        animationType="slide"
        onRequestClose={() => setCreateGroupOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setCreateGroupOpen(false)}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-[16px] font-outfit font-semibold text-app"
                numberOfLines={1}
              >
                Create group
              </Text>
              <Text
                className="text-[11px] font-outfit text-secondary"
                numberOfLines={1}
              >
                Category: {createGroupCategory}
              </Text>
            </View>
            <View className="w-10" />
          </View>

          <View className="px-4 pt-2">
            {createGroupError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {createGroupError}
              </Text>
            ) : null}

            <View
              className="mt-3 rounded-2xl border px-3 py-2"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <TextInput
                value={createGroupName}
                onChangeText={setCreateGroupName}
                placeholder="Group name"
                placeholderTextColor={colors.textSecondary}
                style={{
                  color: colors.text,
                  fontFamily: "Outfit",
                  fontSize: 14,
                  paddingVertical: 8,
                }}
              />
            </View>

            <Pressable
              onPress={openUserPickerForCreate}
              className="mt-3 rounded-2xl border px-4 py-3 flex-row items-center justify-between"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
                borderColor: colors.border,
              })}
            >
              <View>
                <Text className="text-[13px] font-outfit font-semibold text-app">
                  Members
                </Text>
                <Text className="text-[11px] font-outfit text-secondary">
                  {createGroupMemberIds.length} selected
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => void createGroup()}
              disabled={!createGroupName.trim() || createGroupSaving}
              className="mt-5 rounded-2xl px-4 py-3"
              style={({ pressed }) => ({
                backgroundColor:
                  !createGroupName.trim() || createGroupSaving
                    ? isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(15,23,42,0.08)"
                    : colors.tint,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text
                className="text-[13px] font-outfit font-semibold text-center"
                style={{
                  color:
                    !createGroupName.trim() || createGroupSaving
                      ? colors.textSecondary
                      : "#FFFFFF",
                }}
              >
                {createGroupSaving ? "Creating…" : "Create"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =============== GROUP MEMBERS MODAL =============== */}
      <Modal
        visible={groupMembersOpen}
        animationType="slide"
        onRequestClose={() => setGroupMembersOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setGroupMembersOpen(false)}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-[16px] font-outfit font-semibold text-app"
                numberOfLines={1}
              >
                Members
              </Text>
              <Text
                className="text-[11px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {groupMembers.length} in group
              </Text>
            </View>
            <Pressable
              onPress={openUserPickerForAddMembers}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="person-add" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ThemedScrollView
            onRefresh={async () => {
              const gid = activeGroupIdRef.current;
              if (!gid) return;
              await loadGroupMembers(gid);
            }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          >
            {groupMembersLoading ? (
              <View className="py-4">
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : groupMembersError ? (
              <Text selectable className="text-sm font-outfit text-red-400">
                {groupMembersError}
              </Text>
            ) : groupMembers.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">
                No members found.
              </Text>
            ) : (
              <View className="gap-3">
                {groupMembers.map((m) => (
                  <View
                    key={String(m.userId)}
                    className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: colors.border }}
                  >
                    <Text
                      className="text-[13px] font-outfit font-semibold text-app"
                      numberOfLines={1}
                    >
                      {String(m.name ?? `User ${m.userId}`)}
                    </Text>
                    <Text
                      className="text-[12px] font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      {m.email ?? ""}
                    </Text>
                    <Text
                      className="text-[11px] font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      {m.role ?? ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ThemedScrollView>
        </View>
      </Modal>

      {/* =============== USER PICKER MODAL =============== */}
      <Modal
        visible={userPickerOpen}
        animationType="slide"
        onRequestClose={() => setUserPickerOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setUserPickerOpen(false)}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View className="flex-1 px-3">
              <Text
                className="text-[16px] font-outfit font-semibold text-app"
                numberOfLines={1}
              >
                {userPickerTitle}
              </Text>
              <Text
                className="text-[11px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {
                  Object.keys(userPickerSelected).filter(
                    (k) => userPickerSelected[Number(k)],
                  ).length
                }{" "}
                selected
              </Text>
            </View>
            <Pressable
              onPress={() => void confirmUserPicker()}
              className="px-3 py-2 rounded-full"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? colors.backgroundSecondary
                  : "transparent",
              })}
            >
              <Text
                className="text-[13px] font-outfit font-semibold"
                style={{ color: colors.tint }}
              >
                Done
              </Text>
            </Pressable>
          </View>

          <View className="px-4">
            <View
              className="mt-2 rounded-full border px-4 py-2 flex-row items-center gap-2"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                placeholder="Search users…"
                placeholderTextColor={colors.textSecondary}
                value={userPickerQuery}
                onChangeText={setUserPickerQuery}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: "Outfit",
                  fontSize: 14,
                  paddingVertical: 0,
                }}
              />
            </View>

            {userPickerError ? (
              <Text
                selectable
                className="mt-3 text-sm font-outfit text-red-400"
              >
                {userPickerError}
              </Text>
            ) : null}
          </View>

          <ThemedScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          >
            {userPickerLoading ? (
              <View className="py-4">
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : userPickerResults.length === 0 ? (
              <Text className="mt-4 text-sm font-outfit text-secondary">
                No users found.
              </Text>
            ) : (
              <View className="gap-3 mt-4">
                {userPickerResults.map((u) => {
                  const id = safeNumber(u.id, NaN);
                  if (!Number.isFinite(id) || id <= 0) return null;
                  const selected = Boolean(userPickerSelected[id]);
                  return (
                    <Pressable
                      key={String(id)}
                      onPress={() =>
                        setUserPickerSelected((prev) => ({
                          ...prev,
                          [id]: !prev[id],
                        }))
                      }
                      className="rounded-2xl border px-4 py-3"
                      style={({ pressed }) => ({
                        borderColor: colors.border,
                        backgroundColor: pressed
                          ? colors.backgroundSecondary
                          : "transparent",
                      })}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className="text-[13px] font-outfit font-semibold text-app"
                            numberOfLines={1}
                          >
                            {String(u.name ?? `User ${id}`)}
                          </Text>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {u.email ?? ""}
                          </Text>
                          <Text
                            className="text-[11px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {u.role ?? ""}
                          </Text>
                        </View>
                        <View
                          className="h-7 w-7 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: selected
                              ? colors.tint
                              : colors.backgroundSecondary,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color="#FFFFFF"
                            />
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ThemedScrollView>
        </View>
      </Modal>
    </View>
  );
}
