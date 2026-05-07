import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useRefreshContext } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

import React from "react";
import { Pressable, View, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { User, Camera, Mail, Lock, Save } from "lucide-react-native";
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
  const p = useAdminPastel();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);

  const c = {
    bg: p.pageBg,
    card: p.cardLavender,
    text: p.textPrimary,
    textSec: p.textSecondary,
    accent: p.accent,
    inputBg: p.inputBg,
    inputBorder: p.inputBorder,
  };

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

  const hasChanges = name !== (profile.name || "");
  const cardRadius = 28;
  const btnRadius = 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <MoreStackHeader
        title="Profile Information"
        subtitle="Manage your personal details and avatar."
        badge="Account"
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ThemedScrollView
        onRefresh={handleRefresh}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 60,
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        {isLoading ? (
          <View style={{ gap: 16 }}>
            <Skeleton width="100%" height={240} borderRadius={cardRadius} />
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            {/* Main Profile Card */}
            <View
              style={{
                overflow: "hidden",
                borderRadius: cardRadius,
                borderWidth: 0,
                borderCurve: "continuous",
                padding: 24,
                backgroundColor: c.card,
                borderColor: c.inputBorder,
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
                    <View style={{ width: 100, height: 100, borderRadius: 32, overflow: "hidden", borderWidth: 2, borderColor: c.accent, borderCurve: "continuous" }}>
                      <Image source={{ uri: profile.avatar }} style={{ width: 100, height: 100 }} contentFit="cover" />
                    </View>
                  ) : (
                    <View style={{ width: 100, height: 100, borderRadius: 32, backgroundColor: c.inputBg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.accent, borderCurve: "continuous" }}>
                      <User size={40} color={c.accent} />
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: -8, right: -8, width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.card }}>
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Camera size={16} color="#fff" />
                    )}
                  </View>
                </Pressable>
                <Text style={{ marginTop: 16, fontSize: 13, fontFamily: "Outfit", color: c.textSec }}>
                  Tap to update avatar
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ fontSize: 12, fontFamily: "ClashDisplay-Semibold", textTransform: "uppercase", letterSpacing: 1.2, color: c.textSec, marginBottom: 8, marginLeft: 4 }}>
                    Full Name
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: c.inputBorder, borderCurve: "continuous" }}>
                    <User size={18} color={c.textSec} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontFamily: "Outfit", color: c.text }}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor={c.textSec}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 12, fontFamily: "ClashDisplay-Semibold", textTransform: "uppercase", letterSpacing: 1.2, color: c.textSec, marginBottom: 8, marginLeft: 4 }}>
                    Email Address
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: c.inputBorder, borderCurve: "continuous" }}>
                    <Mail size={18} color={c.textSec} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontFamily: "Outfit", color: c.textSec }}
                      value={email}
                      editable={false}
                    />
                    <Lock size={14} color={c.textSec} style={{ marginLeft: 8 }} />
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
                transform: [{ scale: pressed && hasChanges && !isSaving ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  height: 56,
                  borderRadius: btnRadius,
                  borderCurve: "continuous",
                  backgroundColor: c.accent,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: c.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <Save size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 16, fontFamily: "ClashDisplay-Bold" }}>
                  {isSaving ? "Saving Updates..." : "Save Changes"}
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </ThemedScrollView>
      </KeyboardAvoidingView>

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
            style={{ width: "100%", maxWidth: 320, borderRadius: cardRadius, borderCurve: "continuous", backgroundColor: c.card, padding: 24, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontFamily: "ClashDisplay-Bold", color: c.text, marginBottom: 8 }}>Use this photo?</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit", color: c.textSec, textAlign: "center", marginBottom: 24 }}>
              This will be visible across your profile.
            </Text>

            {pendingAvatarUri ? (
              <View style={{ marginBottom: 32, borderRadius: 40, borderCurve: "continuous", overflow: "hidden", borderWidth: 4, borderColor: c.inputBorder }}>
                <Image source={{ uri: pendingAvatarUri }} style={{ width: 140, height: 140 }} />
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
              <Pressable
                style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 100, borderCurve: "continuous", borderWidth: 0, borderColor: c.inputBorder, backgroundColor: c.inputBg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
                onPress={() => setPendingAvatarUri(null)}
              >
                <Text style={{ fontFamily: "Outfit", color: c.text, fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 100, borderCurve: "continuous", backgroundColor: c.accent, alignItems: "center", justifyContent: "center", opacity: isUploadingAvatar ? 0.5 : (pressed ? 0.8 : 1) })}
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
