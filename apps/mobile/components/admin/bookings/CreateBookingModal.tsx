import React, { useEffect, useState } from "react";
import { View, Modal, Platform, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { ServiceType, AdminUserLite } from "@/types/admin";
import { Feather } from "@/components/ui/theme-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

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

// --- Internal Components ---

function ActionButton({
  label,
  onPress,
  tone = "accent",
  size = "md",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "neutral" | "success" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
}) {
  const { colors, isDark } = useAppTheme();
  const bg = tone === "accent" || tone === "success" ? "#22C55E" : 
             tone === "danger" ? "#EF4444" : 
             isDark ? "rgba(255,255,255,0.15)" : "#F1F5F9";
  const textColor = (tone === "neutral" && !isDark) ? "#0F172A" : "#FFFFFF";
  const height = size === "sm" ? 44 : size === "md" ? 58 : 66;
  const px = size === "sm" ? 16 : size === "md" ? 28 : 36;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        height,
        paddingHorizontal: px,
        borderRadius: 14,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: (disabled || loading) ? 0.6 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "sm" ? 18 : 22} color={textColor} style={{ marginRight: 10 }} />}
          <Text
            className="font-outfit-bold uppercase tracking-[1.5px]"
            style={{ color: textColor, fontSize: size === "sm" ? 13 : 15 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  prefix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  prefix?: string;
}) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View className="mb-6">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border flex-row items-center px-5"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
          minHeight: multiline ? 140 : 62,
          paddingTop: multiline ? 18 : 0,
          paddingBottom: multiline ? 18 : 0,
          borderWidth: isFocused ? 2 : 1,
        }}
      >
        {prefix && (
          <View className="bg-accent/10 px-2.5 py-1.5 rounded-lg mr-3">
            <Text className="text-[14px] font-outfit-bold text-accent">{prefix}</Text>
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 text-[17px] font-outfit text-app"
          cursorColor={colors.accent}
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
  colors,
  isDark,
  insetsTop,
}: CreateBookingModalProps) {

  // Auto-search when query changes
  useEffect(() => {
    if (form.userQuery.length > 1) {
      const timeout = setTimeout(() => {
        onSearchUsers();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [form.userQuery]);

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    ...(isDark ? Shadows.none : Shadows.md),
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
          <View>
            <Text className="text-3xl font-clash font-bold text-app">New Booking</Text>
            <Text className="text-sm font-outfit text-textSecondary mt-1">Manual admin schedule bypass</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            className="h-12 w-12 rounded-full bg-secondary/5 items-center justify-center border border-app/5"
          >
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ThemedScrollView showsVerticalScrollIndicator={false}>
          <View className="p-6 pb-40">
            {/* User Selection */}
            <View className="mb-10">
              <FormInput 
                label="Athlete / User" 
                value={form.userQuery} 
                onChangeText={form.setUserQuery} 
                placeholder="Search by name or email..." 
              />
              
              {form.userQuery.length > 0 && !form.selectedUser?.id && (
                <View 
                  className="mb-6 rounded-[24px] border overflow-hidden"
                  style={cardStyle}
                >
                  {users.length === 0 ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="small" color={colors.accent} />
                      <Text className="mt-3 text-xs font-outfit text-textSecondary">Finding users...</Text>
                    </View>
                  ) : 
                    users.slice(0, 6).map(u => (
                      <TouchableOpacity 
                        key={u.id} 
                        onPress={() => {
                          form.setSelectedUser(u);
                          form.setUserQuery(u.name || u.email || "Unknown");
                        }}
                        className="p-5 border-b border-app/5 last:border-0 flex-row items-center justify-between"
                      >
                        <View className="flex-1">
                          <Text className="font-outfit-bold text-[16px] text-app">{u.name}</Text>
                          <Text className="text-[12px] font-outfit text-textSecondary mt-0.5">{u.email}</Text>
                        </View>
                        <Feather name="plus-circle" size={20} color={colors.accent} />
                      </TouchableOpacity>
                    ))
                  }
                </View>
              )}

              {form.selectedUser?.id && (
                <View className="mb-8 flex-row items-center justify-between bg-accent/5 p-5 rounded-[22px] border border-accent/20">
                  <View className="flex-row items-center flex-1">
                    <View className="h-10 w-10 rounded-full bg-accent/10 items-center justify-center mr-4">
                      <Feather name="user" size={20} color={colors.accent} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[11px] font-outfit-bold text-accent uppercase tracking-wider mb-0.5">Confirmed Athlete</Text>
                      <Text className="font-outfit-bold text-[16px] text-app">{form.selectedUser.name}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { form.setSelectedUser(null); form.setUserQuery(""); }}>
                    <Feather name="x-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Service Selection */}
            <View className="mb-10">
              <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2.5px] mb-4 ml-1">
                Session Type
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {services.filter(s => s.isActive !== false).map(s => {
                  const isSelected = form.serviceId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => form.setServiceId(s.id)}
                      activeOpacity={0.8}
                      className="px-5 py-4 rounded-[20px] border"
                      style={{
                        backgroundColor: isSelected ? colors.accent : isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                        borderColor: isSelected ? colors.accent : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)",
                        minWidth: '47%'
                      }}
                    >
                      <Text 
                        className={`text-[14px] font-outfit-bold mb-1 ${isSelected ? 'text-white' : 'text-app'}`}
                      >
                        {s.name}
                      </Text>
                      <Text className={`text-[10px] font-outfit uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-textSecondary'}`}>
                        {s.durationMinutes}m • {s.type?.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Time Note */}
            <View className="p-8 rounded-[32px] bg-secondary/5 border border-app/5 mb-10">
              <View className="flex-row items-center gap-3 mb-3">
                <Feather name="info" size={18} color={colors.accent} />
                <Text className="text-[11px] font-outfit-bold text-app uppercase tracking-[2px]">Scheduling Logic</Text>
              </View>
              <Text className="text-sm font-outfit text-textSecondary leading-relaxed italic">
                Managed securely by the Service Type parameters. Manual calendar overrides have been disabled to prevent scheduling conflicts.
              </Text>
            </View>

            {/* Additional Details */}
            <View className="mb-12">
              <FormInput 
                label="Custom Location" 
                value={form.location} 
                onChangeText={form.setLocation} 
                placeholder="Defaults to service location..." 
              />
              <FormInput 
                label="Meeting Link" 
                value={form.meetingLink} 
                onChangeText={form.setMeetingLink} 
                placeholder="https://zoom.us/..." 
              />
            </View>

            {form.error && (
              <View className="mb-8 p-5 rounded-[22px] bg-red-500/10 border border-red-500/20">
                <Text className="text-red-400 font-outfit text-center text-sm">{form.error}</Text>
              </View>
            )}

            <ActionButton 
              label="Create Confirmed Booking" 
              onPress={form.submit} 
              loading={isBusy}
              tone="success"
              size="lg"
              icon="calendar"
            />
          </View>
        </ThemedScrollView>
      </SafeAreaView>
    </Modal>
  );
}
