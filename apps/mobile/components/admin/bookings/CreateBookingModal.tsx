import React from "react";
import { View, Modal, Platform, TextInput, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "../AdminShared";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ServiceType, AdminUserLite } from "@/types/admin";

interface CreateBookingModalProps {
  isVisible: boolean;
  onClose: () => void;
  form: any;
  services: ServiceType[];
  users: AdminUserLite[];
  onSearchUsers: () => void;
  colors: any;
  isDark: boolean;
  insetsTop: number;
}

export function CreateBookingModal({
  isVisible,
  onClose,
  form,
  services,
  users,
  onSearchUsers,
  colors,
  isDark,
  insetsTop,
}: CreateBookingModalProps) {
  const cardBg = isDark ? colors.cardElevated : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insetsTop }}>
        <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
          <View style={{ flex: 1 }}>
            <Text className="text-[18px] font-clash font-bold text-app">Create booking</Text>
            <Text className="text-[12px] font-outfit text-secondary">
              Admin/coach creates a confirmed booking.
            </Text>
          </View>
          <SmallAction label="Done" tone="neutral" onPress={onClose} />
        </View>

        <ThemedScrollView>
          <View className="gap-4 p-4">
            {/* User Search Card */}
            <View
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <Text className="text-[13px] font-outfit-semibold text-app">User</Text>
              <Text className="text-[12px] font-outfit text-secondary mt-1">
                Search by name or email, then select.
              </Text>
              <View
                className="mt-3 rounded-2xl border px-4 py-3"
                style={{ backgroundColor: inputBg, borderColor: inputBorder }}
              >
                <TextInput
                  className="text-[14px] font-outfit text-app"
                  value={form.userQuery}
                  onChangeText={form.setUserQuery}
                  placeholder="e.g. piers, piers@email.com"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View className="flex-row gap-2 mt-3">
                <SmallAction label="Search" tone="neutral" onPress={onSearchUsers} />
                {form.selectedUser?.id && (
                  <SmallAction label="Clear" tone="neutral" onPress={() => form.setSelectedUser(null)} />
                )}
              </View>

              {form.selectedUser?.id ? (
                <View
                  className="mt-3 rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                >
                  <Text className="text-[12px] font-outfit text-secondary">Selected</Text>
                  <Text className="text-[14px] font-outfit text-app" numberOfLines={1}>
                    #{form.selectedUser.id} {form.selectedUser.name ?? form.selectedUser.email ?? "User"}
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                    {form.selectedUser.email ?? ""}
                    {form.selectedUser.athleteName ? ` • ${form.selectedUser.athleteName}` : ""}
                  </Text>
                </View>
              ) : users.length > 0 ? (
                <View className="mt-3 gap-2">
                  {users.slice(0, 8).map((u) => (
                    <Pressable
                      key={`u-${u.id ?? "x"}-${u.email ?? ""}`}
                      onPress={() => form.setSelectedUser(u)}
                      className="rounded-2xl border px-4 py-3"
                      style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                    >
                      <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
                        #{u.id ?? "—"} {u.name ?? u.email ?? "User"}
                      </Text>
                      <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                        {u.email ?? ""}
                        {u.athleteName ? ` • ${u.athleteName}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Service Type Pick */}
            <View
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <Text className="text-[13px] font-outfit-semibold text-app">Service type</Text>
              <Text className="text-[12px] font-outfit text-secondary mt-1">Pick the session type.</Text>
              {services.length === 0 ? (
                <Text className="text-[12px] font-outfit text-secondary mt-3">Loading services…</Text>
              ) : (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {services.filter((s) => s.isActive !== false).slice(0, 12).map((s) => (
                    <Pressable
                      key={`svc-${s.id}`}
                      onPress={() => form.setServiceId(s.id)}
                      className="rounded-full border px-3 py-2"
                      style={{
                        backgroundColor: form.serviceId === s.id
                          ? isDark ? `${colors.accent}22` : `${colors.accent}16`
                          : inputBg,
                        borderColor: form.serviceId === s.id
                          ? isDark ? `${colors.accent}44` : `${colors.accent}2E`
                          : inputBorder,
                      }}
                    >
                      <Text
                        className="text-[11px] font-outfit-semibold"
                        style={{ color: form.serviceId === s.id ? colors.accent : colors.textSecondary }}
                        numberOfLines={1}
                      >
                        #{s.id} {s.name ?? "Service"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Date & Time Pick */}
            <View
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <Text className="text-[13px] font-outfit-semibold text-app">Date & time</Text>
              <View className="mt-3 gap-2">
                <Pressable
                  onPress={() => form.setShowDatePicker(true)}
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                >
                  <Text className="text-[12px] font-outfit text-secondary">Date</Text>
                  <Text className="text-[14px] font-outfit text-app">{form.date.toLocaleDateString()}</Text>
                </Pressable>
                <Pressable
                  onPress={() => form.setShowTimePicker(true)}
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                >
                  <Text className="text-[12px] font-outfit text-secondary">Start time</Text>
                  <Text className="text-[14px] font-outfit text-app">
                    {form.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
              </View>

              {form.showDatePicker && (
                <DateTimePicker
                  value={form.date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    form.setShowDatePicker(false);
                    if (d) form.setDate(d);
                  }}
                />
              )}
              {form.showTimePicker && (
                <DateTimePicker
                  value={form.time}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, d) => {
                    form.setShowTimePicker(false);
                    if (d) form.setTime(d);
                  }}
                />
              )}
            </View>

            {/* Details & Submit */}
            <View
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <Text className="text-[13px] font-outfit-semibold text-app">Details (optional)</Text>
              <View className="mt-3 gap-2">
                <View
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                >
                  <TextInput
                    className="text-[14px] font-outfit text-app"
                    value={form.location}
                    onChangeText={form.setLocation}
                    placeholder="Location"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: inputBg, borderColor: inputBorder }}
                >
                  <TextInput
                    className="text-[14px] font-outfit text-app"
                    value={form.meetingLink}
                    onChangeText={form.setMeetingLink}
                    placeholder="Meeting link"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {form.error && <Text className="text-[12px] font-outfit text-red-400 mt-3">{form.error}</Text>}

              <View className="flex-row gap-2 mt-4">
                <SmallAction
                  label="Create confirmed"
                  tone="success"
                  onPress={form.submit}
                />
              </View>
            </View>
          </View>
        </ThemedScrollView>
      </View>
    </Modal>
  );
}
