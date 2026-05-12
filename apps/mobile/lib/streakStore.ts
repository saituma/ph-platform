import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiRequest } from "./api";

const DEVICE_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

const MILESTONES = [3, 7, 14, 30, 100, 365] as const;

export interface StreakRecordResult {
  newStreak: number;
  isMilestone: boolean;
  milestoneDay: number;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalSessions: number;
  totalMinutes: number;
  completedDates: string[];
  freezesAvailable: number;
  freezesUsedDates: string[];
  timezone: string;
  lastSessionDate: string | null;
  lastShownDate: string | null;
  lastMilestoneShown: number;

  recordSession: (durationMinutes: number) => StreakRecordResult;
  syncToServer: (token: string) => Promise<void>;
  hydrateFromServer: (payload: ServerStreakPayload) => void;
  markShown: () => void;
  markMilestoneShown: (day: number) => void;
  shouldShowStreak: () => boolean;
  shouldShowMilestone: () => boolean;
  getWeekDays: () => WeekDay[];
  getMonthGrid: (yearMonth?: string) => MonthDay[][];
}

export interface WeekDay {
  label: string;
  date: number;
  completed: boolean;
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthDay {
  date: number;
  dateKey: string;
  completed: boolean;
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
  isEmpty: boolean;
}

export interface ServerStreakPayload {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalSessions: number;
  totalMinutes: number;
  completedDates: string[];
  freezesAvailable: number;
  freezesUsedDates: string[];
  timezone: string | null;
  lastActivityDate: string | null;
}

function todayKey(tz: string = DEVICE_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateAddDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(fromKey + "T12:00:00Z").getTime();
  const to = new Date(toKey + "T12:00:00Z").getTime();
  return Math.round((to - from) / 86400000);
}

function calcStreak(completedDates: string[], freezeUsedDates: string[], tz: string = DEVICE_TZ): number {
  const all = [...new Set([...completedDates, ...freezeUsedDates])].sort().reverse();
  if (all.length === 0) return 0;

  const today = todayKey(tz);
  const yesterday = dateAddDays(today, -1);

  if (all[0] !== today && all[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < all.length; i++) {
    const diff = daysBetween(all[i], all[i - 1]);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function getWeekDaysImpl(completedDates: string[], freezeUsedDates: string[], tz: string): WeekDay[] {
  const labels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const today = todayKey(tz);
  const todayDate = new Date(today + "T12:00:00Z");
  const dow = todayDate.getUTCDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const mondayKey = dateAddDays(today, mondayOffset);

  const completedSet = new Set(completedDates);
  const frozenSet = new Set(freezeUsedDates);

  return labels.map((label, i) => {
    const key = dateAddDays(mondayKey, i);
    return {
      label,
      date: parseInt(key.slice(8, 10), 10),
      completed: completedSet.has(key),
      frozen: frozenSet.has(key) && !completedSet.has(key),
      isToday: key === today,
      isFuture: key > today,
    };
  });
}

function getMonthGridImpl(
  completedDates: string[],
  freezeUsedDates: string[],
  tz: string,
  yearMonth?: string,
): MonthDay[][] {
  const today = todayKey(tz);
  const target = yearMonth ?? today.slice(0, 7);
  const [y, m] = target.split("-").map(Number);

  const firstDayKey = `${target}-01`;
  const firstDate = new Date(firstDayKey + "T12:00:00Z");
  const dow = firstDate.getUTCDay(); // 0=Sun
  const startOffset = dow === 0 ? 6 : dow - 1; // Monday-anchored

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const completedSet = new Set(completedDates);
  const frozenSet = new Set(freezeUsedDates);

  const cells: MonthDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: 0, dateKey: "", completed: false, frozen: false, isToday: false, isFuture: false, isEmpty: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${target}-${String(d).padStart(2, "0")}`;
    cells.push({
      date: d,
      dateKey: key,
      completed: completedSet.has(key),
      frozen: frozenSet.has(key) && !completedSet.has(key),
      isToday: key === today,
      isFuture: key > today,
      isEmpty: false,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: 0, dateKey: "", completed: false, frozen: false, isToday: false, isFuture: false, isEmpty: true });
  }

  const weeks: MonthDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      totalSessions: 0,
      totalMinutes: 0,
      completedDates: [],
      freezesAvailable: 0,
      freezesUsedDates: [],
      timezone: DEVICE_TZ,
      lastSessionDate: null,
      lastShownDate: null,
      lastMilestoneShown: 0,

      recordSession: (durationMinutes: number): StreakRecordResult => {
        const state = get();
        const tz = state.timezone || DEVICE_TZ;
        const key = todayKey(tz);

        if (state.completedDates.includes(key)) {
          set((s) => ({
            totalSessions: s.totalSessions + 1,
            totalMinutes: s.totalMinutes + Math.round(durationMinutes),
          }));
          return { newStreak: state.currentStreak, isMilestone: false, milestoneDay: 0 };
        }

        let filledDates = [...state.completedDates];
        let usedFreezeDates = [...state.freezesUsedDates];
        let freezesLeft = state.freezesAvailable;

        // Backfill missed days with freezes
        if (filledDates.length > 0 && freezesLeft > 0) {
          const sorted = [...new Set(filledDates)].sort().reverse();
          const latestKey = sorted[0];
          const yesterday = dateAddDays(key, -1);
          const gap = daysBetween(latestKey, yesterday);

          if (gap > 0 && gap <= freezesLeft) {
            for (let d = 1; d <= gap; d++) {
              const missedKey = dateAddDays(latestKey, d);
              if (!filledDates.includes(missedKey) && !usedFreezeDates.includes(missedKey)) {
                usedFreezeDates.push(missedKey);
                freezesLeft--;
              }
            }
          }
        }

        filledDates = [...filledDates, key];
        const newStreak = calcStreak(filledDates, usedFreezeDates, tz);
        const prevStreak = state.currentStreak;

        // Grant +1 freeze at every 7-day boundary (cap 2)
        if (newStreak > prevStreak && newStreak % 7 === 0 && freezesLeft < 2) {
          freezesLeft = Math.min(2, freezesLeft + 1);
        }

        const newLongest = Math.max(state.longestStreak, newStreak);

        set({
          completedDates: filledDates,
          freezesAvailable: freezesLeft,
          freezesUsedDates: usedFreezeDates,
          currentStreak: newStreak,
          longestStreak: newLongest,
          totalDays: state.totalDays + 1,
          totalSessions: state.totalSessions + 1,
          totalMinutes: state.totalMinutes + Math.round(durationMinutes),
          lastSessionDate: key,
        });

        const isMilestone =
          (MILESTONES as readonly number[]).includes(newStreak) &&
          newStreak > state.lastMilestoneShown;

        return { newStreak, isMilestone, milestoneDay: isMilestone ? newStreak : 0 };
      },

      syncToServer: async (token: string): Promise<void> => {
        const state = get();
        try {
          const result = await apiRequest<ServerStreakPayload>("/streaks/sync", {
            method: "POST",
            token,
            body: {
              currentStreak: state.currentStreak,
              longestStreak: state.longestStreak,
              totalDays: state.totalDays,
              totalSessions: state.totalSessions,
              totalMinutes: state.totalMinutes,
              completedDates: state.completedDates,
              lastActivityDate: state.lastSessionDate,
              freezesAvailable: state.freezesAvailable,
              freezesUsedDates: state.freezesUsedDates,
              timezone: state.timezone,
            },
          });
          if (result) {
            get().hydrateFromServer(result);
          }
        } catch {
          // fire-and-forget — local state is authoritative
        }
      },

      hydrateFromServer: (payload: ServerStreakPayload): void => {
        const state = get();
        const tz = payload.timezone ?? state.timezone ?? DEVICE_TZ;

        const mergedDates = [...new Set([...state.completedDates, ...(payload.completedDates ?? [])])].sort();
        const mergedFreezes = [
          ...new Set([...state.freezesUsedDates, ...(payload.freezesUsedDates ?? [])]),
        ].sort();

        const recomputedStreak = calcStreak(mergedDates, mergedFreezes, tz);

        set({
          currentStreak: recomputedStreak,
          longestStreak: Math.max(
            state.longestStreak,
            payload.longestStreak,
            recomputedStreak,
          ),
          totalDays: Math.max(state.totalDays, payload.totalDays),
          totalSessions: Math.max(state.totalSessions, payload.totalSessions),
          totalMinutes: Math.max(state.totalMinutes, payload.totalMinutes),
          completedDates: mergedDates,
          freezesAvailable: Math.max(state.freezesAvailable, payload.freezesAvailable ?? 0),
          freezesUsedDates: mergedFreezes,
          timezone: tz,
          lastSessionDate: payload.lastActivityDate ?? state.lastSessionDate,
        });
      },

      markShown: (): void => {
        set({ lastShownDate: todayKey(get().timezone || DEVICE_TZ) });
      },

      markMilestoneShown: (day: number): void => {
        set({ lastMilestoneShown: day });
      },

      shouldShowStreak: (): boolean => {
        const state = get();
        const today = todayKey(state.timezone || DEVICE_TZ);
        return state.totalSessions > 0 && state.lastShownDate !== today;
      },

      shouldShowMilestone: (): boolean => {
        const state = get();
        return (
          (MILESTONES as readonly number[]).includes(state.currentStreak) &&
          state.currentStreak > state.lastMilestoneShown
        );
      },

      getWeekDays: (): WeekDay[] => {
        const s = get();
        return getWeekDaysImpl(s.completedDates, s.freezesUsedDates, s.timezone || DEVICE_TZ);
      },

      getMonthGrid: (yearMonth?: string): MonthDay[][] => {
        const s = get();
        return getMonthGridImpl(s.completedDates, s.freezesUsedDates, s.timezone || DEVICE_TZ, yearMonth);
      },
    }),
    {
      name: "session_streak",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Partial<StreakState>;
        if (version < 2) {
          return {
            ...state,
            freezesAvailable: 0,
            freezesUsedDates: [],
            timezone: DEVICE_TZ,
            lastMilestoneShown: 0,
          };
        }
        return state;
      },
    },
  ),
);
