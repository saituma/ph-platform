import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalSessions: number;
  totalMinutes: number;
  completedDates: string[];
  lastSessionDate: string | null;
  lastShownDate: string | null;

  recordSession: (durationMinutes: number) => void;
  markShown: () => void;
  shouldShowStreak: () => boolean;
  getWeekDays: () => WeekDay[];
}

export interface WeekDay {
  label: string;
  date: number;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const latestDate = new Date(sorted[0] + "T00:00:00");
  if (latestDate < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const cur = new Date(sorted[i - 1] + "T00:00:00");
    const prev = new Date(sorted[i] + "T00:00:00");
    const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getWeekDaysImpl(completedDates: string[]): WeekDay[] {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const set = new Set(completedDates);

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label,
      date: d.getDate(),
      completed: set.has(key),
      isToday: d.getTime() === today.getTime(),
      isFuture: d > today,
    };
  });
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
      lastSessionDate: null,
      lastShownDate: null,

      recordSession: (durationMinutes: number) => {
        const key = todayKey();
        set((state) => {
          const dates = state.completedDates.includes(key)
            ? state.completedDates
            : [...state.completedDates, key];
          const streak = calcStreak(dates);
          const isNewDay = !state.completedDates.includes(key);
          return {
            completedDates: dates,
            currentStreak: streak,
            longestStreak: Math.max(state.longestStreak, streak),
            totalDays: isNewDay ? state.totalDays + 1 : state.totalDays,
            totalSessions: state.totalSessions + 1,
            totalMinutes: state.totalMinutes + Math.round(durationMinutes),
            lastSessionDate: key,
          };
        });
      },

      markShown: () => {
        set({ lastShownDate: todayKey() });
      },

      shouldShowStreak: () => {
        const state = get();
        return state.totalSessions > 0 && state.lastShownDate !== todayKey();
      },

      getWeekDays: () => {
        return getWeekDaysImpl(get().completedDates);
      },
    }),
    {
      name: "session_streak",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
