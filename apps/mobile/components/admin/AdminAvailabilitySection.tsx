import React, { useState, useEffect } from "react";
import { View, Pressable, TextInput, Modal, Platform } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { formatIsoShort } from "@/lib/admin-utils";
import { SmallAction } from "./AdminShared";
import { useAdminAvailability } from "@/hooks/admin/useAdminAvailability";
import { ServiceType } from "@/types/admin";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Shadows } from "@/constants/theme";

interface Props {
  token: string | null;
  canLoad: boolean;
  services: ServiceType[];
}

export function AdminAvailabilitySection({ token, canLoad, services }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const availabilityHook = useAdminAvailability(token, canLoad);

  const [availabilityServiceTypeId, setAvailabilityServiceTypeId] = useState("");
  const [availabilityStartsAt, setAvailabilityStartsAt] = useState("");
  const [availabilityEndsAt, setAvailabilityEndsAt] = useState("");
  const [availabilityStartDate, setAvailabilityStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [availabilityEndDate, setAvailabilityEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });
  const [availabilityShowStartPicker, setAvailabilityShowStartPicker] = useState(false);
  const [availabilityShowEndPicker, setAvailabilityShowEndPicker] = useState(false);
  const [availabilityDetailOpenId, setAvailabilityDetailOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (canLoad) {
      availabilityHook.loadAvailability(false);
    }
  }, [canLoad]);

  useEffect(() => {
    setAvailabilityStartsAt(availabilityStartDate.toISOString());
  }, [availabilityStartDate]);

  useEffect(() => {
    setAvailabilityEndsAt(availabilityEndDate.toISOString());
  }, [availabilityEndDate]);

  const handleCreate = async () => {
    try {
      await availabilityHook.createAvailabilityBlock({
        serviceTypeId: availabilityServiceTypeId,
        startsAt: availabilityStartsAt,
        endsAt: availabilityEndsAt,
      });
      setAvailabilityServiceTypeId("");
    } catch (e) {
      // Error handled by hook or can be handled here if we want local state
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-3">
        <Text className="text-[13px] font-outfit-semibold text-app">Create availability block</Text>
        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Service type</Text>
          {services.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {services
                .filter((s) => s.isActive !== false)
                .slice(0, 8)
                .map((s) => (
                  <Pressable
                    key={`svc-chip-${s.id}`}
                    accessibilityRole="button"
                    onPress={() => setAvailabilityServiceTypeId(String(s.id))}
                    className="rounded-full border px-3 py-2"
                    style={{
                      backgroundColor:
                        availabilityServiceTypeId === String(s.id)
                          ? isDark ? `${colors.accent}22` : `${colors.accent}16`
                          : isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor:
                        availabilityServiceTypeId === String(s.id)
                          ? isDark ? `${colors.accent}44` : `${colors.accent}2E`
                          : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text
                      className="text-[11px] font-outfit-semibold"
                      style={{
                        color: availabilityServiceTypeId === String(s.id) ? colors.accent : colors.textSecondary,
                      }}
                      numberOfLines={1}
                    >
                      #{s.id} {s.name ?? "Service"}
                    </Text>
                  </Pressable>
                ))}
            </View>
          )}
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={availabilityServiceTypeId}
              onChangeText={setAvailabilityServiceTypeId}
              placeholder="e.g. 3"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Start</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Pressable accessibilityRole="button" onPress={() => setAvailabilityShowStartPicker(true)}>
              <Text className="text-[14px] font-outfit text-app">
                {availabilityStartDate.toLocaleString()}
              </Text>
              <Text className="text-[11px] font-outfit text-secondary mt-1">{availabilityStartsAt}</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">End</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Pressable accessibilityRole="button" onPress={() => setAvailabilityShowEndPicker(true)}>
              <Text className="text-[14px] font-outfit text-app">
                {availabilityEndDate.toLocaleString()}
              </Text>
              <Text className="text-[11px] font-outfit text-secondary mt-1">{availabilityEndsAt}</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row gap-2">
          <SmallAction
            label={availabilityHook.availabilityCreateBusy ? "Creating…" : "Create"}
            tone="success"
            onPress={handleCreate}
            disabled={availabilityHook.availabilityCreateBusy}
          />
          <SmallAction
            label="Refresh"
            tone="neutral"
            onPress={() => availabilityHook.loadAvailability(true)}
            disabled={availabilityHook.availabilityLoading}
          />
        </View>

        {availabilityShowStartPicker && (
          <DateTimePicker
            value={availabilityStartDate}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, date) => {
              setAvailabilityShowStartPicker(false);
              if (date) setAvailabilityStartDate(date);
            }}
          />
        )}
        {availabilityShowEndPicker && (
          <DateTimePicker
            value={availabilityEndDate}
            mode="datetime"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, date) => {
              setAvailabilityShowEndPicker(false);
              if (date) setAvailabilityEndDate(date);
            }}
          />
        )}
      </View>

      {availabilityHook.availabilityLoading && availabilityHook.availability.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="92%" height={14} />
          <Skeleton width="86%" height={14} />
          <Skeleton width="90%" height={14} />
        </View>
      ) : availabilityHook.availabilityError ? (
        <Text selectable className="text-sm font-outfit text-red-400">
          {availabilityHook.availabilityError}
        </Text>
      ) : availabilityHook.availability.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">No availability blocks.</Text>
      ) : (
        <View className="gap-3">
          {availabilityHook.availability.map((a) => (
            <Pressable
              key={String(a.id)}
              accessibilityRole="button"
              onPress={() => setAvailabilityDetailOpenId(a.id)}
              className="rounded-2xl border px-4 py-3"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
                #{a.id} {a.serviceName ?? "(service)"}
              </Text>
              <Text selectable className="text-[12px] font-outfit text-secondary">
                {formatIsoShort(a.startsAt)} → {formatIsoShort(a.endsAt)}
              </Text>
              <Text selectable className="text-[11px] font-outfit text-secondary">
                Created {formatIsoShort(a.createdAt)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* AVAILABILITY DETAIL MODAL */}
      <Modal
        visible={availabilityDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setAvailabilityDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
                Availability #{availabilityDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">Block details</Text>
            </View>
            <SmallAction label="Done" tone="neutral" onPress={() => setAvailabilityDetailOpenId(null)} />
          </View>

          <ThemedScrollView>
            {availabilityDetailOpenId != null && (() => {
              const block = availabilityHook.availability.find((x) => x.id === availabilityDetailOpenId);
              if (!block) return <Text className="text-sm font-outfit text-secondary p-4">Not found.</Text>;
              return (
                <View className="gap-3 p-4">
                  <View
                    className="rounded-[20px] border p-4"
                    style={{
                      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                      ...(isDark ? Shadows.none : Shadows.md),
                    }}
                  >
                    <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={2}>
                      {block.serviceName ?? "(service)"}
                    </Text>
                    <Text selectable className="text-[12px] font-outfit text-secondary">
                      {formatIsoShort(block.startsAt)} → {formatIsoShort(block.endsAt)}
                    </Text>
                    <Text selectable className="text-[11px] font-outfit text-secondary">
                      Created {formatIsoShort(block.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </ThemedScrollView>
        </View>
      </Modal>
    </View>
  );
}
