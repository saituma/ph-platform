import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
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

export type CoachFeedbackEntry = {
  logId: number;
  dateKey: string;
  coachFeedback: string;
  coachFeedbackMediaUrl: string | null;
  updatedAt: string;
};

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

export function useNutritionDay(dateKey?: string) {
  const { token } = useAppSelector((s) => s.user);
  const { actingUserId: athleteUserId } = useActingUser();
  const { socket } = useSocket();
  const today = dateKey || new Date().toISOString().slice(0, 10);

  const [data, setData] = useState<DailyNutrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachHistory, setCoachHistory] = useState<CoachFeedbackEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!initialLoadDone.current) {
        setLoading(true);
      }

      const [logRes, targetRes] = await Promise.all([
        apiRequest<{ logs: any[] }>(
          `/nutrition/logs?userId=${athleteUserId || "me"}&from=${today}&to=${today}&limit=5`,
          { token, suppressLog: true },
        ),
        apiRequest<{ targets: any }>(
          `/nutrition/targets/${athleteUserId || "me"}`,
          { token, suppressLog: true },
        ).catch(() => ({ targets: null })),
      ]);

      const log = (logRes.logs ?? []).find((l: any) => l.dateKey === today) ?? null;
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

      const snackRaw = log?.snacksMorning || log?.snacksAfternoon || log?.snacksEvening || log?.snacks || null;

      const meals = {
        breakfast: buildSlot("breakfast", "Breakfast", log?.breakfast),
        lunch: buildSlot("lunch", "Lunch", log?.lunch),
        dinner: buildSlot("dinner", "Dinner", log?.dinner),
        snack: buildSlot("snack", "Snack", snackRaw),
      };

      const eatenCalories = Object.values(meals).reduce(
        (sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0),
        0,
      );

      const carbsG = typeof targets.carbs === "number" ? targets.carbs : 0;
      const proteinG = typeof targets.protein === "number" ? targets.protein : 0;
      const fatsG = typeof targets.fats === "number" ? targets.fats : 0;

      setData({
        dateKey: today,
        targetCalories,
        eatenCalories,
        burnedCalories: 0,
        meals,
        macros: {
          carbs: { grams: carbsG, kcal: carbsG * 4 },
          protein: { grams: proteinG, kcal: proteinG * 4 },
          fats: { grams: fatsG, kcal: fatsG * 9 },
        },
      });
    } catch {
      if (!initialLoadDone.current) setData(null);
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [token, athleteUserId, today]);

  const optimisticUpdateMeal = useCallback(
    (slot: MealSlotName, items: MealItem[]) => {
      setData((prev) => {
        if (!prev) return prev;
        const slotData: MealSlotData = {
          ...prev.meals[slot],
          items,
        };
        const meals = { ...prev.meals, [slot]: slotData };
        const eatenCalories = Object.values(meals).reduce(
          (sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0),
          0,
        );
        return { ...prev, meals, eatenCalories };
      });
    },
    [],
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

      const res = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?userId=${athleteUserId || "me"}&from=${fromKey}&to=${toKey}&limit=100`,
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

  useEffect(() => {
    void fetchData();
    void fetchCoachHistory();
  }, [fetchData, fetchCoachHistory]);

  // Socket listeners + local push notification on feedback
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onLogUpdated = () => {
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
  }, [socket, fetchData, fetchCoachHistory]);

  return {
    data,
    loading,
    coachHistory,
    historyLoading,
    refetch: fetchData,
    refetchCoachHistory: fetchCoachHistory,
    optimisticUpdateMeal,
  };
}
