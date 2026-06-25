import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useActingUser } from "@/hooks/useActingUser";
import { apiRequest } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import type { DailyNutrition, MealItem, MealSlotData, MealSlotName } from "./types";

const SLOT_SPLITS: Record<MealSlotName, { pct: number; min: number; max: number }> = {
  breakfast: { pct: 0.25, min: 0.20, max: 0.28 },
  lunch: { pct: 0.30, min: 0.25, max: 0.32 },
  dinner: { pct: 0.30, min: 0.28, max: 0.35 },
  snack: { pct: 0.15, min: 0.10, max: 0.18 },
};

function parseMealItems(raw: string | undefined | null): MealItem[] {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "yes") return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: any) => item && typeof item.name === "string")
        .map((item: any, idx: number) => ({
          id: item.id || `parsed_${idx}`,
          name: item.name,
          calories: typeof item.calories === "number" ? item.calories : 0,
          weightGrams: typeof item.weightGrams === "number" ? item.weightGrams : 0,
          unit: typeof item.unit === "string" ? item.unit : "g",
          protein: typeof item.protein === "number" ? item.protein : 0,
          carbs: typeof item.carbs === "number" ? item.carbs : 0,
          fat: typeof item.fat === "number" ? item.fat : 0,
        }));
    }
  } catch {}

  return trimmed
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, idx) => ({
      id: `text_${idx}`,
      name,
      calories: 0,
      weightGrams: 0,
      unit: "g",
    }));
}

function sumMacros(items: MealItem[]) {
  return items.reduce(
    (acc, i) => ({
      protein: acc.protein + (i.protein ?? 0),
      carbs: acc.carbs + (i.carbs ?? 0),
      fats: acc.fats + (i.fat ?? 0),
    }),
    { protein: 0, carbs: 0, fats: 0 },
  );
}

function firstFilledText(logs: any[], key: string): string | null {
  for (const log of logs) {
    const value = log?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export type CoachFeedbackEntry = {
  logId: number;
  dateKey: string;
  coachFeedback: string;
  coachFeedbackMediaUrl: string | null;
  updatedAt: string;
};

export type RecentLogEntry = {
  logId: number;
  dateKey: string;
  summary: string;
  hasFeedback: boolean;
};

const MEAL_SUMMARY_FIELDS: { key: string; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
  { key: "snacksMorning", label: "Snacks" },
  { key: "snacksAfternoon", label: "Snacks" },
  { key: "snacksEvening", label: "Snacks" },
];

function summarizeLog(log: any): string {
  const present = new Set<string>();
  for (const { key, label } of MEAL_SUMMARY_FIELDS) {
    const value = log?.[key];
    if (typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "yes") {
      present.add(label);
    }
  }
  const labels = Array.from(present);
  return labels.length ? labels.join(" · ") : "Logged";
}

async function fireLocalNotification(title: string, body: string, data?: Record<string, string>) {
  try {
    const { getNotifications } = await import("@/lib/notifications");
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: "default",
      },
      trigger: null,
    });
  } catch {}
}

export function useNutritionDay(dateKey?: string, athleteUserIdOverride?: number | null) {
  const { token } = useAppSelector((s) => s.user);
  const myUserId = useAppSelector((s) => s.user.profile?.id ?? null);
  const { actingUserId } = useActingUser();
  // Explicit override (e.g. a manager viewing one of their athletes) wins over the acting user.
  const athleteUserId = athleteUserIdOverride ?? actingUserId;
  const { socket } = useSocket();
  const today = dateKey || new Date().toISOString().slice(0, 10);

  const [data, setData] = useState<DailyNutrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachHistory, setCoachHistory] = useState<CoachFeedbackEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLogEntry[]>([]);
  const [recentLogsLoading, setRecentLogsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const lastFetchDataRef = useRef<number>(0);
  const lastFetchRecentLogsRef = useRef<number>(0);
  const prevDateRef = useRef<string>(today);
  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      setError(null);

      const [logRes, targetRes] = await Promise.all([
        apiRequest<{ logs: any[] }>(
          `/nutrition/logs?userId=${athleteUserId || "me"}&from=${today}&to=${today}&limit=5`,
          { token, suppressLog: true, forceRefresh: true },
        ),
        apiRequest<{ targets: any }>(
          `/nutrition/targets/${athleteUserId || "me"}`,
          { token, suppressLog: true },
        ).catch(() => ({ targets: null })),
      ]);

      const dayLogs = (logRes.logs ?? []).filter((l: any) => l?.dateKey === today);
      const targets = targetRes.targets ?? {};

      const targetCalories =
        typeof targets.calories === "number" && Number.isFinite(targets.calories)
          ? targets.calories
          : 2000;

      const buildSlot = (slot: MealSlotName, label: string, rawField: string | null | undefined) => {
        const split = SLOT_SPLITS[slot];
        return {
          slot,
          label,
          items: parseMealItems(rawField),
          recommendedMin: Math.round(targetCalories * split.min),
          recommendedMax: Math.round(targetCalories * split.max),
        };
      };

      const breakfastRaw = firstFilledText(dayLogs, "breakfast");
      const lunchRaw = firstFilledText(dayLogs, "lunch");
      const dinnerRaw = firstFilledText(dayLogs, "dinner");
      const snackRaw =
        firstFilledText(dayLogs, "snacksMorning") ||
        firstFilledText(dayLogs, "snacksAfternoon") ||
        firstFilledText(dayLogs, "snacksEvening") ||
        firstFilledText(dayLogs, "snacks");

      const meals = {
        breakfast: buildSlot("breakfast", "Breakfast", breakfastRaw),
        lunch: buildSlot("lunch", "Lunch", lunchRaw),
        dinner: buildSlot("dinner", "Dinner", dinnerRaw),
        snack: buildSlot("snack", "Snack", snackRaw),
      };

      const allItems = Object.values(meals).flatMap((m) => m.items);
      const eatenCalories = allItems.reduce((s, i) => s + i.calories, 0);
      const eaten = sumMacros(allItems);

      const carbsTarget = typeof targets.carbs === "number" ? targets.carbs : 0;
      const proteinTarget = typeof targets.protein === "number" ? targets.protein : 0;
      const fatsTarget = typeof targets.fats === "number" ? targets.fats : 0;

      setData({
        dateKey: today,
        targetCalories,
        eatenCalories,
        burnedCalories: 0,
        meals,
        macros: {
          carbs: { eaten: eaten.carbs, target: carbsTarget },
          protein: { eaten: eaten.protein, target: proteinTarget },
          fats: { eaten: eaten.fats, target: fatsTarget },
        },
        hasMacroTargets: carbsTarget > 0 || proteinTarget > 0 || fatsTarget > 0,
      });
      lastFetchDataRef.current = Date.now();
    } catch (e) {
      if (!initialLoadDone.current) setData(null);
      setError(e instanceof Error ? e.message : "Couldn't load your nutrition.");
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [token, athleteUserId, today]);

  const optimisticUpdateMeal = useCallback(
    (slot: MealSlotName, items: MealItem[]) => {
      setData((prev) => {
        const targetCalories = prev?.targetCalories ?? 2000;
        const emptySlot = (s: MealSlotName, label: string): MealSlotData => ({
          slot: s,
          label,
          items: [],
          recommendedMin: Math.round(targetCalories * SLOT_SPLITS[s].min),
          recommendedMax: Math.round(targetCalories * SLOT_SPLITS[s].max),
        });
        // Build a base even when the day hasn't loaded yet, so a freshly logged
        // meal always shows immediately instead of being dropped.
        const base: DailyNutrition = prev ?? {
          dateKey: today,
          targetCalories,
          eatenCalories: 0,
          burnedCalories: 0,
          meals: {
            breakfast: emptySlot("breakfast", "Breakfast"),
            lunch: emptySlot("lunch", "Lunch"),
            dinner: emptySlot("dinner", "Dinner"),
            snack: emptySlot("snack", "Snack"),
          },
          macros: {
            carbs: { eaten: 0, target: 0 },
            protein: { eaten: 0, target: 0 },
            fats: { eaten: 0, target: 0 },
          },
          hasMacroTargets: false,
        };
        const slotData: MealSlotData = { ...base.meals[slot], items };
        const meals = { ...base.meals, [slot]: slotData };
        const allItems = Object.values(meals).flatMap((m) => m.items);
        const eatenCalories = allItems.reduce((s, i) => s + i.calories, 0);
        const eaten = sumMacros(allItems);
        return {
          ...base,
          meals,
          eatenCalories,
          macros: {
            carbs: { ...base.macros.carbs, eaten: eaten.carbs },
            protein: { ...base.macros.protein, eaten: eaten.protein },
            fats: { ...base.macros.fats, eaten: eaten.fats },
          },
        };
      });
    },
    [today],
  );

  const fetchCoachHistory = useCallback(async () => {
    if (!token) {
      setHistoryLoading(false);
      return;
    }
    try {
      setHistoryLoading(true);
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      const fromKey = start.toISOString().slice(0, 10);
      const toKey = end.toISOString().slice(0, 10);

      // hasFeedback=true makes the server return only logs that have coach feedback,
      // instead of pulling the whole 30-day window and filtering on-device.
      const res = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?userId=${athleteUserId || "me"}&from=${fromKey}&to=${toKey}&limit=60&hasFeedback=true`,
        { token, suppressLog: true },
      );

      const withFeedback = (res.logs ?? [])
        .filter((log: any) => {
          const text = typeof log.coachFeedback === "string" ? log.coachFeedback.trim() : "";
          const media = typeof log.coachFeedbackMediaUrl === "string" ? log.coachFeedbackMediaUrl.trim() : "";
          return Boolean(text || media);
        })
        .sort((a: any, b: any) => {
          const aKey = typeof a.dateKey === "string" ? a.dateKey : "";
          const bKey = typeof b.dateKey === "string" ? b.dateKey : "";
          return bKey.localeCompare(aKey);
        })
        .map((log: any) => ({
          logId: log.id,
          dateKey: log.dateKey,
          coachFeedback: typeof log.coachFeedback === "string" ? log.coachFeedback.trim() : "",
          coachFeedbackMediaUrl:
            typeof log.coachFeedbackMediaUrl === "string" && log.coachFeedbackMediaUrl.trim()
              ? log.coachFeedbackMediaUrl.trim()
              : null,
          updatedAt: log.updatedAt ?? log.loggedAt ?? "",
        }));

      setCoachHistory(withFeedback);
    } catch {
      setCoachHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, athleteUserId]);

  // The athlete's own logged days (regardless of coach feedback), so they can see
  // and jump to past entries instead of being stuck on an empty "Today".
  const fetchRecentLogs = useCallback(async () => {
    if (!token) {
      setRecentLogsLoading(false);
      return;
    }
    try {
      setRecentLogsLoading(true);
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      const fromKey = start.toISOString().slice(0, 10);
      const toKey = end.toISOString().slice(0, 10);

      const res = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?userId=${athleteUserId || "me"}&from=${fromKey}&to=${toKey}&limit=60`,
        { token, suppressLog: true, forceRefresh: true },
      );

      const entries = (res.logs ?? [])
        .filter((log: any) => typeof log?.dateKey === "string")
        .sort((a: any, b: any) => String(b.dateKey).localeCompare(String(a.dateKey)))
        .map((log: any) => ({
          logId: log.id,
          dateKey: log.dateKey as string,
          summary: summarizeLog(log),
          hasFeedback: Boolean(
            (typeof log.coachFeedback === "string" && log.coachFeedback.trim()) ||
              (typeof log.coachFeedbackMediaUrl === "string" && log.coachFeedbackMediaUrl.trim()),
          ),
        }));

      setRecentLogs(entries);
      lastFetchRecentLogsRef.current = Date.now();
    } catch {
      setRecentLogs([]);
    } finally {
      setRecentLogsLoading(false);
    }
  }, [token, athleteUserId]);

  useEffect(() => {
    void fetchCoachHistory();
    void fetchRecentLogs();
  }, [fetchCoachHistory, fetchRecentLogs]);

  // When the selected date changes (user taps < > arrows in the history view),
  // clear stale data immediately and fetch the new date's log without waiting
  // for the 30-second useFocusEffect throttle.
  useEffect(() => {
    if (prevDateRef.current === today) return;
    prevDateRef.current = today;
    setLoading(true);
    setData(null);
    void fetchData();
  }, [today, fetchData]);

  // Refetch the day whenever the screen regains focus, so a meal logged elsewhere
  // (or while the screen was backgrounded) shows up without restarting the app.
  // Tab screens stay mounted, so a mount-only effect would otherwise serve stale data.
  // Guard against excessive refetching if rapidly toggling focus.
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchDataRef.current > 30 * 1000) {
        void fetchData();
      }
      if (now - lastFetchRecentLogsRef.current > 30 * 1000) {
        void fetchRecentLogs();
      }
    }, [fetchData, fetchRecentLogs]),
  );

  // Socket listeners + local push notification on feedback
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const prev = appStateRef.current;
      appStateRef.current = state;
      // Coming back from background → pull fresh data.
      if (state === "active" && prev !== "active") {
        void fetchData();
      }
    });
    return () => sub.remove();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    const onLogUpdated = (payload?: { actorUserId?: number | string }) => {
      // Ignore the echo of our own just-saved meal (the optimistic update is already
      // authoritative). Skip by actor identity, not a fragile wall-clock window —
      // updates made elsewhere (e.g. a coach) still refetch.
      if (payload?.actorUserId != null && myUserId != null && String(payload.actorUserId) === String(myUserId)) {
        return;
      }
      void fetchData();
    };

    const onFeedbackUpdated = (payload?: { userId?: number | string; dateKey?: string }) => {
      void fetchData();
      void fetchCoachHistory();

      const dateLabel = typeof payload?.dateKey === "string" ? payload.dateKey : "today";
      void fireLocalNotification(
        "Coach responded",
        `Your coach replied to your nutrition log for ${dateLabel}.`,
        { type: "nutrition_feedback", url: "/nutrition" },
      );
    };

    socket.on("nutrition:log:updated", onLogUpdated);
    socket.on("nutrition:feedback:updated", onFeedbackUpdated);

    return () => {
      socket.off("nutrition:log:updated", onLogUpdated);
      socket.off("nutrition:feedback:updated", onFeedbackUpdated);
    };
  }, [socket, fetchData, fetchCoachHistory, myUserId]);

  return {
    data,
    loading,
    error,
    coachHistory,
    historyLoading,
    recentLogs,
    recentLogsLoading,
    refetch: fetchData,
    refetchCoachHistory: fetchCoachHistory,
    refetchRecentLogs: fetchRecentLogs,
    optimisticUpdateMeal,
  };
}
