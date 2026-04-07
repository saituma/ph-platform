import React, { useMemo } from "react";
import { Pressable, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ScheduleEvent } from "./types";
import { formatDateKey } from "./utils";

interface CalendarGridProps {
  calendarMonth: Date;
  todayKey: string;
  selectedCalendarDate: string;
  eventsByDate: Map<string, ScheduleEvent[]>;
  eventsTotalCount: number;
  onSelectDate: (dateKey: string) => void;
  onChangeMonth: (offset: number) => void;
  getEventTone: (type: ScheduleEvent["type"]) => any;
}

export function CalendarGrid({
  calendarMonth,
  todayKey,
  selectedCalendarDate,
  eventsByDate,
  eventsTotalCount,
  onSelectDate,
  onChangeMonth,
  getEventTone,
}: CalendarGridProps) {
  const { colors, isDark } = useAppTheme();

  const monthLabel = useMemo(() => {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${labels[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
  }, [calendarMonth]);

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const cells: { date: Date; key: string; isOutside: boolean }[] = [];

    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startOffset - 1; i >= 0; i -= 1) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      cells.push({ date, key: formatDateKey(date), isOutside: true });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      cells.push({ date, key, isOutside: false });
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    const trailing = totalCells - cells.length;
    for (let i = 1; i <= trailing; i += 1) {
      const date = new Date(year, month + 1, i);
      cells.push({ date, key: formatDateKey(date), isOutside: true });
    }

    return cells;
  }, [calendarMonth]);

  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <View className="px-6 pb-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-5 w-1.5 rounded-full bg-accent" />
          <Text className="text-xl font-clash text-app">Calendar</Text>
        </View>
        <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
          <Text
            className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
            style={{ color: colors.accent }}
          >
            {eventsTotalCount} bookings
          </Text>
        </View>
      </View>

      <View
        className="rounded-[28px] border px-4 py-4"
        style={{
          backgroundColor: surfaceColor,
          borderColor: borderSoft,
          ...(isDark ? Shadows.none : Shadows.sm),
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => onChangeMonth(-1)}
            activeOpacity={0.8}
            className="h-10 w-10 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
          >
            <Feather name="chevron-left" size={18} color={colors.accent} />
          </TouchableOpacity>
          <View className="items-center gap-1">
            <Text className="text-lg font-clash text-app">{monthLabel}</Text>
            <Pressable
              onPress={() => onSelectDate(todayKey)}
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
            >
              <Text className="text-[10px] font-outfit uppercase tracking-[1.2px] text-secondary">
                Today
              </Text>
            </Pressable>
          </View>
          <TouchableOpacity
            onPress={() => onChangeMonth(1)}
            activeOpacity={0.8}
            className="h-10 w-10 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
          >
            <Feather name="chevron-right" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View className="mt-4 flex-row justify-between px-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <Text
              key={label}
              className="text-[0.625rem] font-outfit text-secondary uppercase tracking-[1.4px] w-9 text-center"
            >
              {label}
            </Text>
          ))}
        </View>

        <View
          className="mt-3 overflow-hidden rounded-2xl border"
          style={{ borderColor: borderSoft }}
        >
          <View className="flex-row flex-wrap">
            {calendarGrid.map((cell, index) => {
              const isToday = cell.key === todayKey;
              const isSelected = selectedCalendarDate === cell.key;
              const eventsForDay = eventsByDate.get(cell.key) ?? [];
              const hasEvents = eventsForDay.length > 0;
              return (
                <Pressable
                  key={`${cell.key}-${index}`}
                  onPress={() => onSelectDate(cell.key)}
                  className="h-20"
                  style={{
                    width: `${100 / 7}%`,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: borderSoft,
                    backgroundColor: isSelected
                      ? accentSurface
                      : cell.isOutside
                        ? mutedSurface
                        : "transparent",
                  }}
                >
                  <View className="flex-1 px-2 pt-2">
                    <View className="flex-row items-center justify-between">
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: isSelected
                            ? colors.accent
                            : isToday
                              ? accentSurface
                              : "transparent",
                        }}
                      >
                        <Text
                          className={`text-[11px] font-outfit ${
                            isSelected ? "text-white font-bold" : "text-app"
                          }`}
                          style={
                            !isSelected && isToday
                              ? { color: colors.accent, fontWeight: "700" }
                              : cell.isOutside
                                ? { color: colors.textSecondary, opacity: 0.5 }
                                : undefined
                          }
                        >
                          {cell.date.getDate()}
                        </Text>
                      </View>
                      {hasEvents ? (
                        <View
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: colors.accent }}
                        />
                      ) : null}
                    </View>

                    {eventsForDay.slice(0, 2).map((event) => {
                      const tone = getEventTone(event.type);
                      return (
                        <View
                          key={`${cell.key}-${event.id}`}
                          className="mt-1 rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: isSelected ? "rgba(255,255,255,0.22)" : tone.pillBg,
                          }}
                        >
                          <Text
                            className="text-[10px] font-outfit"
                            style={{
                              color: isSelected ? "#FFFFFF" : colors.text,
                            }}
                            numberOfLines={1}
                          >
                            {event.timeStart} {event.title}
                          </Text>
                        </View>
                      );
                    })}
                    {eventsForDay.length > 2 ? (
                      <Text
                        className="mt-1 text-[10px] font-outfit"
                        style={{ color: colors.textSecondary }}
                      >
                        +{eventsForDay.length - 2} more
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text className="mt-3 text-[11px] font-outfit text-secondary">
          Tap a day to view details below.
        </Text>
      </View>
    </View>
  );
}
