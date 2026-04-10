import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AgeGate } from "@/components/AgeGate";
import { InboxScreen } from "@/components/messages/InboxScreen";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { apiRequest } from "@/lib/api";
import { hasPaidProgramTier } from "@/lib/planAccess";
import { canUseCoachMessaging } from "@/lib/messagingAccess";
import { useMessagesController } from "@/hooks/useMessagesController";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setLatestSubscriptionRequest,
  setMessagingAccessTiers,
  setProgramTier,
} from "@/store/slices/userSlice";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type MessagesHomeMode = "team" | "adult" | "youth";

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

  const actingUserId = React.useMemo(() => {
    const raw = athleteUserId ? Number(athleteUserId) : NaN;
    if (!Number.isFinite(raw) || raw <= 0) return null;

    if (Array.isArray(managedAthletes) && managedAthletes.length > 0) {
      const byUserId = managedAthletes.find(
        (athlete) => String((athlete as any)?.userId) === String(raw),
      );
      if ((byUserId as any)?.userId) {
        const userId = Number((byUserId as any).userId);
        if (Number.isFinite(userId) && userId > 0) return userId;
      }
      const byAthleteId = managedAthletes.find(
        (athlete) => String((athlete as any)?.id) === String(raw),
      );
      if ((byAthleteId as any)?.userId) {
        const userId = Number((byAthleteId as any).userId);
        if (Number.isFinite(userId) && userId > 0) return userId;
      }
    }

    return raw;
  }, [athleteUserId, managedAthletes]);

  const {
    sortedThreads,
    typingStatus,
    isLoading,
    openingThreadId,
    openThread,
    loadMessages,
    resetOpeningThread,
  } = useMessagesController();
  const pathname = usePathname();
  const router = useRouter();
  const canMessage = canUseCoachMessaging(programTier, messagingAccessTiers);
  const paidPlan = hasPaidProgramTier(programTier);
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

  const [announcementsMeta, setAnnouncementsMeta] = React.useState<{
    count: number;
    title: string;
    snippet: string;
    when: string;
  } | null>(null);

  const isMessagesRoute =
    pathname.startsWith("/(tabs)/messages") || pathname.startsWith("/messages");

  React.useEffect(() => {
    if (!token) return;
    if (!isMessagesRoute) return;
    let active = true;
    (async () => {
      try {
        const headers = actingUserId
          ? { "X-Acting-User-Id": String(actingUserId) }
          : undefined;
        const res = await apiRequest<{ items?: any[] }>(
          "/content/announcements",
          {
            token,
            headers,
            skipCache: true,
            suppressStatusCodes: [401, 403, 404],
          },
        );
        const items = Array.isArray(res.items) ? res.items : [];
        const latest = items[0];
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
      }
    })();
    return () => {
      active = false;
    };
  }, [actingUserId, isMessagesRoute, token]);

  React.useEffect(() => {
    if (!token) return;
    const syncBillingStatus = async () => {
      try {
        const status = await apiRequest<{
          currentProgramTier?: string | null;
          messagingAccessTiers?: string[] | null;
          latestRequest?: {
            status?: string | null;
            paymentStatus?: string | null;
            planTier?: string | null;
            createdAt?: string | null;
          } | null;
        }>("/billing/status", {
          token,
          suppressStatusCodes: [401, 403, 404],
          skipCache: true,
        });

        dispatch(setProgramTier(status?.currentProgramTier ?? null));
        dispatch(
          setMessagingAccessTiers(
            Array.isArray(status?.messagingAccessTiers)
              ? status.messagingAccessTiers
              : ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"],
          ),
        );
        dispatch(setLatestSubscriptionRequest(status?.latestRequest ?? null));
      } catch {
        // no-op
      }
    };

    syncBillingStatus();
  }, [dispatch, token]);

  React.useEffect(() => {
    if (!isMessagesRoute) return;
    resetOpeningThread();
  }, [isMessagesRoute, resetOpeningThread]);

  if (isSectionHidden("messages")) {
    return (
      <AgeGate
        title="Messages locked"
        message="Messaging is restricted for this age."
      />
    );
  }

  // ====================== LOCKED / UPGRADE STATE ======================
  // Youth team guardians may still have access to team chat groups even when
  // direct coach messaging is plan-locked.
  if (!canMessage && appRole !== "youth_athlete_team_guardian") {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center mb-6"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="chatbubbles" size={40} color={colors.accent} />
          </View>
          <Text
            className="text-2xl font-clash font-bold text-center mb-3"
            style={{ color: colors.text }}
          >
            Messages
          </Text>
          <Text
            className="text-base font-outfit text-center max-w-[280px]"
            style={{ color: colors.textSecondary }}
          >
            {paidPlan
              ? "Messaging is not enabled for your current plan. Ask your coach if you need access."
              : isYouthAthleteRole
                ? "Open your current plan in Programs and unlock coach messaging for this athlete."
                : "Choose a training plan in the Programs tab to unlock messaging with your coach."}
          </Text>
          {!paidPlan ? (
            <Pressable
              onPress={() => {
                requestGlobalTabChange(0);
                router.replace("/(tabs)/programs");
              }}
              className="mt-8 rounded-full px-8 py-3 bg-accent"
            >
              <Text className="text-sm font-outfit font-semibold text-white">
                Open Programs
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: colors.background }}
    >
      <View className="px-6 pt-8 pb-5">
        <View
          className="rounded-[28px] border px-5 py-5"
          style={{
            backgroundColor: colors.card,
            borderColor: colors.borderSubtle,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-4xl font-telma-bold font-bold tracking-tight"
                style={{ color: colors.text }}
              >
                Messages
              </Text>
              <Text
                className="mt-2 text-base font-outfit"
                style={{ color: colors.textSecondary }}
              >
                {heroSubtitle}
              </Text>
            </View>
            <View
              className="h-12 w-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={24}
                color={colors.accent}
              />
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <Text
                className="text-[11px] font-outfit font-semibold"
                style={{ color: colors.text }}
              >
                {sortedThreads.length} thread
                {sortedThreads.length === 1 ? "" : "s"}
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <Text
                className="text-[11px] font-outfit font-semibold"
                style={{ color: colors.text }}
              >
                {unreadCount} unread
              </Text>
            </View>
            <View
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <Text
                className="text-[11px] font-outfit font-semibold"
                style={{ color: colors.text }}
              >
                {isYouthAthleteRole ? "Coach support" : "Media sharing"}
              </Text>
            </View>
          </View>
          {isYouthAthleteRole && sortedThreads[0] ? (
            <Pressable
              onPress={() => openThread(sortedThreads[0]!)}
              className="mt-4 rounded-full py-3 items-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="text-sm font-outfit font-bold text-white">
                Open latest thread
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="px-6 pb-4">
        <Pressable
          onPress={() => router.push("/announcements" as any)}
          className="rounded-[24px] border px-5 py-4"
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.borderSubtle,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="megaphone-outline"
                size={18}
                color={colors.accent}
              />
              <Text
                className="text-[12px] font-outfit font-bold uppercase tracking-[1.4px]"
                style={{ color: colors.accent }}
              >
                Announcements
              </Text>
            </View>
            {announcementsMeta?.count ? (
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
              >
                <Text
                  className="text-[11px] font-outfit font-bold"
                  style={{ color: colors.accent }}
                >
                  {announcementsMeta.count}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="mt-2 text-base font-outfit font-semibold"
            style={{ color: colors.text }}
            numberOfLines={1}
          >
            {announcementsMeta?.title || "No announcements yet"}
          </Text>
          {announcementsMeta?.when ? (
            <Text
              className="mt-1 text-[12px] font-outfit"
              style={{ color: colors.textSecondary }}
            >
              {announcementsMeta.when}
            </Text>
          ) : null}
          <Text
            className="mt-2 text-[13px] font-outfit leading-5"
            style={{ color: colors.textSecondary }}
            numberOfLines={2}
          >
            {announcementsMeta?.snippet ||
              "Broadcast updates from your coach will appear here."}
          </Text>
        </Pressable>
      </View>

      <InboxScreen
        threads={sortedThreads}
        typingStatus={typingStatus}
        isLoading={isLoading}
        openingThreadId={openingThreadId}
        onRefresh={loadMessages}
        onOpenThread={openThread}
      />
    </SafeAreaView>
  );
}
