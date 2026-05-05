import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRefreshContext } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

import React from "react";
import { Pressable, View, TextInput, ActivityIndicator, Modal } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { ManagedAthletesSection } from "@/components/more/profile/ManagedAthletesSection";
import * as Haptics from "expo-haptics";

export default function ProfileSettingsScreen() {
  const { isSectionHidden } = useAgeExperience();
  const { isLoading } = useRefreshContext();
  const { colors, isDark } = useAppTheme();
  const { token, appRole } = useAppSelector((state) => state.user);

  const {
    profile,
    managedAthletes,
    managedAthleteCount,
    name,
    setName,
    email,
    isUploadingAvatar,
    pendingAvatarUri,
    setPendingAvatarUri,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handleSave,
  } = useProfileSettings();

  if (isSectionHidden("settings")) {
    return (
      <AgeGate
        title="Settings locked"
        message="Settings are restricted for this age."
      />
    );
  }

  const handleRefresh = async () => {
    if (!token) return;
    try {
      const me = await apiRequest<{
        user?: {
          name?: string | null;
          email?: string | null;
          profilePicture?: string | null;
        };
      }>("/auth/me", {
        token,
        suppressStatusCodes: [401, 403],
        skipCache: true,
        forceRefresh: true,
      });
      if (me.user) {
        if (me.user.name) setName(me.user.name);
      }
    } catch {
      /* keep existing profile */
    }
  };

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(150, 20%, 97%)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220, 5%, 94%)" : "hsl(220, 8%, 10%)";
  const subtleBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)";

  const hasChanges = name !== (profile.name || "");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <MoreStackHeader
        title="Profile Information"
        subtitle="Manage your personal details and avatar."
        badge="Account"
      />

      <ThemedScrollView
        onRefresh={handleRefresh}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: 60,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        {isLoading ? (
          <View style={{ gap: 16 }}>
            <Skeleton width="100%" height={240} borderRadius={28} />
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Main Profile Card */}
            <View
              style={{
                overflow: "hidden",
                borderRadius: 28,
                borderWidth: 1,
                borderCurve: "continuous",
                padding: 24,
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <Pressable
                  onPress={handlePickAvatar}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    position: "relative",
                  })}
                >
                  {profile.avatar ? (
                    <View style={{ width: 100, height: 100, borderRadius: 32, overflow: "hidden", borderWidth: 2, borderColor: colors.accent, borderCurve: "continuous" }}>
                      <Image source={{ uri: profile.avatar }} style={{ width: 100, height: 100 }} contentFit="cover" />
                    </View>
                  ) : (
                    <View style={{ width: 100, height: 100, borderRadius: 32, backgroundColor: subtleBg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent, borderCurve: "continuous" }}>
                      <Feather name="user" size={40} color={colors.accent} />
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: -8, right: -8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: cardBg }}>
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="camera" size={16} color="#fff" />
                    )}
                  </View>
                </Pressable>
                <Text style={{ marginTop: 16, fontSize: 13, fontFamily: "Outfit", color: labelColor }}>
                  Tap to update avatar
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: "ClashDisplay-Semibold", textTransform: "uppercase", letterSpacing: 1.2, color: labelColor, marginBottom: 8, marginLeft: 4 }}>
                    Full Name
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: subtleBg, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: cardBorder, borderCurve: "continuous" }}>
                    <Feather name="user" size={18} color={labelColor} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontFamily: "Outfit", color: textPrimary }}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor={labelColor}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12, fontFamily: "ClashDisplay-Semibold", textTransform: "uppercase", letterSpacing: 1.2, color: labelColor, marginBottom: 8, marginLeft: 4 }}>
                    Email Address
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: cardBorder, borderCurve: "continuous" }}>
                    <Feather name="mail" size={18} color={labelColor} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontFamily: "Outfit", color: labelColor }}
                      value={email}
                      editable={false}
                    />
                    <Feather name="lock" size={14} color={labelColor} style={{ marginLeft: 8 }} />
                  </View>
                </View>
              </View>
            </View>

            {appRole !== "admin" && appRole !== "super_admin" && (
              <ManagedAthletesSection
                managedAthletes={managedAthletes}
                managedAthleteCount={managedAthleteCount}
              />
            )}

            <Pressable 
              onPress={() => {
                if (!hasChanges) return;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                handleSave();
              }} 
              disabled={isSaving || !hasChanges} 
              style={({ pressed }) => ({
                marginTop: 8,
                opacity: (isSaving || !hasChanges) ? 0.5 : (pressed ? 0.8 : 1),
                transform: [{ scale: pressed && hasChanges && !isSaving ? 0.98 : 1 }]
              })}
            >
              <View
                style={{
                  height: 56,
                  borderRadius: 20,
                  borderCurve: "continuous",
                  backgroundColor: colors.accent,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <Feather name="save" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 16, fontFamily: "ClashDisplay-Bold" }}>
                  {isSaving ? "Saving Updates..." : "Save Changes"}
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </ThemedScrollView>

      {/* Avatar Confirmation Modal */}
      <Modal
        visible={Boolean(pendingAvatarUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAvatarUri(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}
          onPress={() => setPendingAvatarUri(null)}
        >
          <Pressable 
            style={{ width: "100%", maxWidth: 320, borderRadius: 28, borderCurve: "continuous", backgroundColor: isDark ? "#1C1C1E" : "#FFF", padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontFamily: "ClashDisplay-Bold", color: textPrimary, marginBottom: 8 }}>Use this photo?</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", color: labelColor, textAlign: "center", marginBottom: 24 }}>
              This will be visible across your profile.
            </Text>
            
            {pendingAvatarUri ? (
              <View style={{ marginBottom: 32, borderRadius: 40, borderCurve: "continuous", overflow: "hidden", borderWidth: 4, borderColor: cardBorder }}>
                <Image source={{ uri: pendingAvatarUri }} style={{ width: 140, height: 140 }} />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
              <Pressable
                style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 16, borderCurve: "continuous", borderWidth: 1, borderColor: cardBorder, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
                onPress={() => setPendingAvatarUri(null)}
              >
                <Text style={{ fontFamily: "Outfit", color: textPrimary, fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: isUploadingAvatar ? 0.5 : (pressed ? 0.8 : 1) })}
                disabled={isUploadingAvatar}
                onPress={handleConfirmAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontFamily: "Outfit", color: "#fff", fontSize: 15, fontWeight: "600" }}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
