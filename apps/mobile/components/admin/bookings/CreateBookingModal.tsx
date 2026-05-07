import React, { useEffect, useState } from "react";
import { View, Modal, Platform, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ServiceType, AdminUserLite } from "@/types/admin";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Calendar, Clock, User, PlusCircle, XCircle, X, Search } from "lucide-react-native";

interface CreateBookingModalProps {
  isVisible: boolean;
  onClose: () => void;
  form: any;
  services: ServiceType[];
  users: AdminUserLite[];
  onSearchUsers: () => void;
  isBusy: boolean;
  colors: any;
  isDark: boolean;
  insetsTop: number;
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(value: Date) {
  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PastelInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  p,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  p: any;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Outfit-Bold",
          color: p.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1.6,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: p.inputBg,
          borderRadius: 16,
          borderWidth: isFocused ? 2 : 1,
          borderColor: isFocused ? p.accent : p.inputBorder,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          minHeight: multiline ? 120 : 52,
          paddingTop: multiline ? 14 : 0,
          paddingBottom: multiline ? 14 : 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={p.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? "top" : "center"}
          cursorColor={p.accent}
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: "Outfit-Regular",
            color: p.textPrimary,
          }}
        />
      </View>
    </View>
  );
}

export function CreateBookingModal({
  isVisible,
  onClose,
  form,
  services,
  users,
  onSearchUsers,
  isBusy,
}: CreateBookingModalProps) {
  const p = useAdminPastel();

  useEffect(() => {
    if (form.userQuery.length > 1) {
      const timeout = setTimeout(() => {
        onSearchUsers();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [form.userQuery]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: p.divider,
          }}
        >
          <View>
            <Text style={{ fontSize: 22, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
              New Booking
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }}>
              Schedule a session for an athlete
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: p.cardSage,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color={p.textSecondary} />
          </Pressable>
        </View>

        <ThemedScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        >
          {/* User Selection */}
          <View style={{ marginBottom: 28 }}>
            <PastelInput
              label="Athlete / User"
              value={form.userQuery}
              onChangeText={form.setUserQuery}
              placeholder="Search by name or email..."
              p={p}
            />

            {form.userQuery.length > 0 && !form.selectedUser?.id && (
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: p.cardWhite,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                {users.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={p.accent} />
                    <Text style={{ marginTop: 8, fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted }}>
                      Finding users...
                    </Text>
                  </View>
                ) : (
                  users.slice(0, 6).map((u, i) => (
                    <Pressable
                      key={u.id}
                      onPress={() => {
                        form.setSelectedUser(u);
                        form.setUserQuery(u.name || u.email || "Unknown");
                      }}
                      style={{
                        padding: 14,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottomWidth: i < Math.min(users.length, 6) - 1 ? 1 : 0,
                        borderBottomColor: p.divider,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                          {u.name}
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }}>
                          {u.email}
                        </Text>
                      </View>
                      <PlusCircle size={20} color={p.accent} />
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {form.selectedUser?.id && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: p.cardMint,
                  padding: 14,
                  borderRadius: 18,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      height: 38,
                      width: 38,
                      borderRadius: 12,
                      backgroundColor: p.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <User size={18} color={p.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.accent, textTransform: "uppercase", letterSpacing: 1.2 }}>
                      Confirmed
                    </Text>
                    <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                      {form.selectedUser.name}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => { form.setSelectedUser(null); form.setUserQuery(""); }}>
                  <XCircle size={22} color={p.textMuted} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Service Selection */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Outfit-Bold",
                color: p.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                marginBottom: 10,
                marginLeft: 4,
              }}
            >
              Session Type
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {services.filter(s => s.isActive !== false).map(s => {
                const isSelected = form.serviceId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => form.setServiceId(s.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 16,
                      backgroundColor: isSelected ? p.accent : p.cardWhite,
                      minWidth: "46%",
                      flexGrow: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Outfit-Bold",
                        color: isSelected ? p.buttonPrimaryText : p.textPrimary,
                        marginBottom: 3,
                      }}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Outfit-Regular",
                        color: isSelected ? `${p.buttonPrimaryText}CC` : p.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {s.durationMinutes}m • {s.type?.replace(/_/g, " ")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date & Time */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Outfit-Bold",
                color: p.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                marginBottom: 10,
                marginLeft: 4,
              }}
            >
              Date & Time
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => form.setShowDatePicker(true)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: p.cardWhite,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Calendar size={14} color={p.accent} />
                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Date
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                  {formatDateLabel(form.date)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => form.setShowTimePicker(true)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: p.cardWhite,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Clock size={14} color={p.accent} />
                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Time
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                  {formatTimeLabel(form.time)}
                </Text>
              </Pressable>
            </View>

            {form.showDatePicker ? (
              <View style={{ marginTop: 12 }}>
                <DateTimePicker
                  value={form.date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(_: unknown, selected?: Date) => {
                    if (Platform.OS !== "ios") form.setShowDatePicker(false);
                    if (selected) form.setDate(selected);
                  }}
                />
              </View>
            ) : null}
            {form.showTimePicker ? (
              <View style={{ marginTop: 12 }}>
                <DateTimePicker
                  value={form.time}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_: unknown, selected?: Date) => {
                    if (Platform.OS !== "ios") form.setShowTimePicker(false);
                    if (selected) form.setTime(selected);
                  }}
                />
              </View>
            ) : null}
          </View>

          {/* Additional Details */}
          <View style={{ marginBottom: 28 }}>
            <PastelInput
              label="Custom Location"
              value={form.location}
              onChangeText={form.setLocation}
              placeholder="Defaults to service location..."
              p={p}
            />
            <PastelInput
              label="Meeting Link"
              value={form.meetingLink}
              onChangeText={form.setMeetingLink}
              placeholder="https://zoom.us/..."
              p={p}
            />
          </View>

          {/* Error */}
          {form.error && (
            <View
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 16,
                backgroundColor: p.dangerSoft,
              }}
            >
              <Text style={{ color: p.danger, fontFamily: "Outfit-Regular", fontSize: 14, textAlign: "center" }}>
                {form.error}
              </Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={form.submit}
            disabled={isBusy}
            style={{
              height: 54,
              borderRadius: 100,
              backgroundColor: p.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            {isBusy ? (
              <ActivityIndicator color={p.buttonPrimaryText} size="small" />
            ) : (
              <>
                <Calendar size={18} color={p.buttonPrimaryText} />
                <Text style={{ fontSize: 15, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
                  Create Confirmed Booking
                </Text>
              </>
            )}
          </Pressable>
        </ThemedScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
