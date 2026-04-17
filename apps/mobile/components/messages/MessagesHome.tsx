import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AgeGate } from "@/components/AgeGate";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import {
  useActiveTabIndex,
} from "@/context/ActiveTabContext";
import { apiRequest } from "@/lib/api";
import { hasPaidProgramTier } from "@/lib/planAccess";
import { useMessagesController } from "@/hooks/useMessagesController";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_TEAM_TAB_ROUTES } from "@/roles/shared/tabs";
import { useSafePathname, useSafeRouter } from "@/hooks/navigation/useSafeExpoRouter";

export type MessagesHomeMode = "team" | "adult" | "youth";

function pickLatestAnnouncement(items: unknown[]): any | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return [...items].sort((a: any, b: any) => {
    const tb = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
    const ta = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
    return tb - ta;
  })[0];
}

export function MessagesHome({ mode }: { mode: MessagesHomeMode }) {
  const { colors } = useAppTheme();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const messagingAccessTiers = useAppSelector(
    (state) => state.user.messagingAccessTiers,
  );
  const appRole = useAppSelector((state) => state.user.appRole);
  const profile = useAppSelector((state) => state.user.profile);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const { isSectionHidden } = useAgeExperience();

  const {
    sortedThreads,
    typingStatus,
    isLoading,
    openingThreadId,
    openThread,
    loadMessages,
    resetOpeningThread,
  } = useMessagesController();
  const router = useSafeRouter();
  const pathname = useSafePathname("");
  const activeTabIndex = useActiveTabIndex();
  const messagesTabIndex = React.useMemo(
    () => BASE_TEAM_TAB_ROUTES.findIndex((t) => t.key === "messages"),
    [],
  );
  const isOnMessagesTab =
    messagesTabIndex >= 0 && activeTabIndex === messagesTabIndex;
  const isMessagesRoute =
    pathname.startsWith("/(tabs)/messages") || pathname.startsWith("/messages");
  /** Pager swipe does not always update URL; pathname alone can miss the messages tab. */
  const isMessagesSurface = isOnMessagesTab || isMessagesRoute;
  const canMessage = true;
  const paidPlan = true;
  const isYouthAthleteRole =
    appRole === "youth_athlete_guardian_only" ||
    appRole === "youth_athlete_team_guardian";
  const unreadCount = React.useMemo(
    () =>
      sortedThreads.reduce(
        (sum, thread) => sum + (Number(thread.unread) || 0),
        0,
      ),
    [sortedThreads],
  );
  const activeAthlete = React.useMemo(() => {
    if (!managedAthletes.length) return null;
    return (
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ?? managedAthletes[0]
    );
  }, [athleteUserId, managedAthletes]);
  const focusName = activeAthlete?.name || profile?.name || "Athlete";
  const heroSubtitle = isYouthAthleteRole
    ? `Stay connected with your coach and keep ${focusName}'s plan on track.`
    : mode === "team"
      ? "Team chat, groups, and announcements — in one place."
      : "Cleaner chat, faster replies, and a calmer mobile flow.";

  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true);
  const [announcementsMeta, setAnnouncementsMeta] = React.useState<{
    count: number;
    title: string;
    snippet: string;
    when: string;
  } | null>(null);

  const inboxThreads = React.useMemo(() => {
    if (mode === "team") return sortedThreads;
    return sortedThreads.filter((thread) => thread.channelType !== "team");
  }, [mode, sortedThreads]);

  const channelCounts = React.useMemo(() => {
    const team = inboxThreads.filter((t) => t.channelType === "team").length;
    const coach = inboxThreads.filter((t) => t.channelType === "coach_group").length;
    const direct = inboxThreads.filter(
      (t) => t.channelType === "direct" || !t.id.startsWith("group:"),
    ).length;
    return { team, coach, direct };
  }, [inboxThreads]);

  // Load whenever this screen is shown (MessagesHome only mounts after the Messages tab is visited).
  // Do not gate on URL / active tab index — those can lag one frame and skip the fetch entirely.
  React.useEffect(() => {
    if (!token) {
      setAnnouncementsLoading(false);
      setAnnouncementsMeta(null);
      return;
    }
    let active = true;
    (async () => {
      setAnnouncementsLoading(true);
      try {
        const headers = athleteUserId
          ? { "X-Acting-User-Id": String(athleteUserId) }
          : undefined;
        const res = await apiRequest<{ items?: any[] }>(
          "/content/announcements",
          {
            token,
            headers,
            skipCache: true,
            forceRefresh: true,
            suppressStatusCodes: [401, 403, 404],
          },
        );
        const items = Array.isArray(res.items) ? res.items : [];
        const latest = pickLatestAnnouncement(items);
        if (!active) return;
        if (!latest) {
          setAnnouncementsMeta(null);
          return;
        }
        const title = String(latest.title ?? "").trim() || "Announcement";
        const rawBody =
          typeof latest.body === "string"
            ? latest.body
            : latest.body
              ? String(latest.body)
              : String(latest.content ?? "");
        const snippet = rawBody
          .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
          .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120);
        const timestamp = latest.updatedAt ?? latest.createdAt ?? null;
        const when = timestamp ? new Date(timestamp).toLocaleString() : "";
        setAnnouncementsMeta({
          count: items.length,
          title,
          snippet,
          when,
        });
      } catch {
        if (!active) return;
        setAnnouncementsMeta(null);
      } finally {
        if (active) setAnnouncementsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteUserId, token]);

  React.useEffect(() => {
    if (!isMessagesSurface) return;
    resetOpeningThread();
  }, [isMessagesSurface, resetOpeningThread]);

  if (isSectionHidden("messages")) {
    return (
      <AgeGate
        title="Messages locked"
        message="Messaging is restricted for this age."
      />
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background }}
    >
      <View className="px-6 pt-10 pb-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text
              className="text-5xl font-telma-bold font-bold tracking-tight"
              style={{ color: colors.text }}
            >
              Messages
            </Text>
            <Text
              className="mt-2.5 text-base font-outfit leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              {heroSubtitle}
            </Text>
          </View>
          <View
            className="h-16 w-16 rounded-[24px] items-center justify-center border"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderSubtle,
            }}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={32}
              color={colors.accent}
            />
          </View>
        </View>

        <View className="mt-8 flex-row items-center gap-3">
          <View
            className="rounded-full px-4 py-2 border"
            style={{
              backgroundColor: "rgba(200, 241, 53, 0.08)",
              borderColor: "rgba(200, 241, 53, 0.15)",
            }}
          >
            <Text
              className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider"
              style={{ color: colors.accent }}
            >
              {sortedThreads.length} Thread{sortedThreads.length === 1 ? "" : "s"}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: colors.danger }}
            >
              <Text className="text-[12px] font-outfit-bold font-bold text-white uppercase tracking-wider">
                {unreadCount} New
              </Text>
            </View>
          )}
          <View
            className="rounded-full px-4 py-2 border"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text
              className="text-[12px] font-outfit font-semibold"
              style={{ color: colors.textSecondary }}
            >
              {isYouthAthleteRole ? "Coach Support" : "Media Sharing"}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() => router?.push("/announcements" as any)}
          className="rounded-[32px] border p-6 active:opacity-90"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.borderSubtle,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center"
                style={{ backgroundColor: "rgba(200, 241, 53, 0.12)" }}
              >
                <Ionicons
                  name="megaphone"
                  size={20}
                  color={colors.accent}
                />
              </View>
              <Text
                className="text-[13px] font-outfit-bold font-bold uppercase tracking-[2px]"
                style={{ color: colors.accent }}
              >
                Announcements
              </Text>
            </View>
            {!announcementsLoading && announcementsMeta?.count ? (
              <View
                className="h-8 w-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-[13px] font-outfit-bold font-bold text-black">
                  {announcementsMeta.count}
                </Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            )}
          </View>

          <View>
            <Text
              className="text-xl font-clash-bold font-bold"
              style={{ color: colors.text }}
              numberOfLines={1}
            >
              {announcementsLoading
                ? "Loading announcements…"
                : announcementsMeta?.title || "No announcements yet"}
            </Text>
            <Text
              className="mt-2 text-[14px] font-outfit leading-6"
              style={{ color: colors.textSecondary }}
              numberOfLines={2}
            >
              {announcementsLoading
                ? "Fetching the latest from your coach."
                : announcementsMeta?.snippet ||
                  "Broadcast updates from your coach will appear here."}
            </Text>
            {!announcementsLoading && announcementsMeta?.when ? (
              <View className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <Text
                  className="text-[12px] font-outfit-medium font-medium"
                  style={{ color: colors.textDim }}
                >
                  Updated {announcementsMeta.when}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <View className="px-6 mb-4 flex-row items-center justify-between">
        <Text className="text-[11px] font-outfit-bold font-bold uppercase tracking-[1.5px]" style={{ color: colors.textDim }}>
          Your Inbox
        </Text>
        <Pressable className="flex-row items-center gap-1.5 active:opacity-70">
          <Ionicons name="add-circle" size={18} color={colors.accent} />
          <Text className="text-[13px] font-outfit-bold font-bold" style={{ color: colors.accent }}>
            New Message
          </Text>
        </Pressable>
      </View>

      <InboxScreen
        threads={inboxThreads}
        typingStatus={typingStatus}
        isLoading={isLoading}
        openingThreadId={openingThreadId}
        onRefresh={loadMessages}
        onOpenThread={openThread}
        variant={mode === "team" ? "team" : "default"}
        showEmptySections={mode === "team"}
      />
    </SafeAreaView>
  );
}
