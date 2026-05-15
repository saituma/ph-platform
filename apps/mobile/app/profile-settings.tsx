import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useRefreshContext } from "@/context/RefreshContext";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateProfile } from "@/store/slices/userSlice";

import React from "react";
import {
  Pressable,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image as RNImage,
} from "react-native";
import { Image } from "expo-image";
import {
  User,
  Camera,
  Mail,
  Lock,
  Save,
  ImagePlus,
  Shield,
  Calendar,
  ChevronLeft,
} from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { ManagedAthletesSection } from "@/components/more/profile/ManagedAthletesSection";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { useRouter } from "expo-router";

const { width: _SCREEN_W } = Dimensions.get("window");
const SCREEN_W = Platform.isPad ? Math.min(_SCREEN_W, 560) : _SCREEN_W;
const BANNER_H = 180;
const AVATAR_SIZE = 100;
const AVATAR_RING = AVATAR_SIZE + 10;
const CARD_R = 24;

export default function ProfileSettingsScreen() {
  const { isSectionHidden } = useAgeExperience();
  const { isLoading } = useRefreshContext();
  const p = useAdminPastel();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, appRole, apiUserRole } = useAppSelector((state) => state.user);

  const {
    profile,
    managedAthletes,
    managedAthleteCount,
    name,
    setName,
    email,
    isUploadingAvatar,
    isUploadingCover,
    pendingAvatarUri,
    setPendingAvatarUri,
    isSaving,
    handlePickAvatar,
    handleConfirmAvatar,
    handlePickCoverImage,
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
          coverImage?: string | null;
        };
      }>("/auth/me", {
        token,
        suppressStatusCodes: [401, 403],
        skipCache: true,
        forceRefresh: true,
      });
      if (me.user) {
        if (me.user.name) setName(me.user.name);
        dispatch(
          updateProfile({
            name: me.user.name ?? null,
            email: me.user.email ?? null,
            avatar: me.user.profilePicture ?? null,
            coverImage: me.user.coverImage ?? null,
          }),
        );
      }
    } catch {
      /* keep existing profile */
    }
  };

  const hasChanges = name !== (profile.name || "");
  const ringRadius = (AVATAR_RING - 4) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ThemedScrollView
          onRefresh={handleRefresh}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {isLoading ? (
            <View style={{ padding: 20, gap: 16 }}>
              <Skeleton width="100%" height={BANNER_H} borderRadius={0} />
              <Skeleton width="100%" height={200} borderRadius={CARD_R} />
            </View>
          ) : (
            <View>
              {/* ── Cover Banner ── */}
              <View style={{ position: "relative", width: SCREEN_W, height: BANNER_H }}>
                {profile.coverImage ? (
                  <RNImage
                    source={{ uri: profile.coverImage }}
                    style={{ width: SCREEN_W, height: BANNER_H, position: "absolute" }}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={["#1a1a1a", "#111111", "#0a0a0a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: SCREEN_W, height: BANNER_H, position: "absolute" }}
                  />
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.4)"]}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: BANNER_H * 0.5,
                  }}
                />
                {/* Back button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.back()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 16,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(0,0,0,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    elevation: 20,
                  }}
                >
                  <ChevronLeft size={22} color="#fff" />
                </TouchableOpacity>
                {/* Edit banner button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    handlePickCoverImage();
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    zIndex: 20,
                    elevation: 20,
                  }}
                >
                  {isUploadingCover ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <ImagePlus size={15} color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontFamily: "Outfit-Medium",
                        }}
                      >
                        Edit Cover
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* ── Avatar overlapping banner ── */}
              <Animated.View
                entering={FadeInDown.springify().damping(18).delay(100)}
                style={{
                  alignItems: "center",
                  marginTop: -(AVATAR_SIZE / 2),
                  zIndex: 10,
                }}
              >
                <Pressable
                  onPress={handlePickAvatar}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: AVATAR_RING,
                      height: AVATAR_RING,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Svg
                      width={AVATAR_RING}
                      height={AVATAR_RING}
                      style={{ position: "absolute" }}
                    >
                      <SvgCircle
                        cx={AVATAR_RING / 2}
                        cy={AVATAR_RING / 2}
                        r={ringRadius}
                        stroke={p.accent}
                        strokeWidth={3.5}
                        fill="none"
                        strokeDasharray={`${ringCircumference}`}
                        strokeLinecap="round"
                      />
                    </Svg>
                    {profile.avatar ? (
                      <View
                        style={{
                          width: AVATAR_SIZE,
                          height: AVATAR_SIZE,
                          borderRadius: AVATAR_SIZE / 2,
                          overflow: "hidden",
                          borderWidth: 3,
                          borderColor: p.pageBg,
                        }}
                      >
                        <Image
                          source={{ uri: profile.avatar }}
                          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                          contentFit="cover"
                        />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: AVATAR_SIZE,
                          height: AVATAR_SIZE,
                          borderRadius: AVATAR_SIZE / 2,
                          backgroundColor: p.inputBg,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 3,
                          borderColor: p.pageBg,
                        }}
                      >
                        <User size={40} color={p.textSecondary} />
                      </View>
                    )}
                    {/* Camera badge */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: p.accent,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 3,
                        borderColor: p.pageBg,
                      }}
                    >
                      {isUploadingAvatar ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Camera size={14} color="#fff" />
                      )}
                    </View>
                  </View>
                </Pressable>

                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 22,
                    fontFamily: "Outfit-Bold",
                    color: p.textPrimary,
                  }}
                >
                  {profile.name || "Your Name"}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 14,
                    fontFamily: "Outfit",
                    color: p.textSecondary,
                  }}
                >
                  {profile.email || "email@example.com"}
                </Text>
              </Animated.View>

              {/* ── Form Section ── */}
              <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 20 }}>
                {/* Role & Member Since Bento */}
                <Animated.View
                  entering={FadeInDown.springify().damping(18).delay(150)}
                  style={{ flexDirection: "row", gap: 12 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: p.cardWhite,
                      borderRadius: 20,
                      padding: 16,
                      borderCurve: "continuous",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: p.inputBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Shield size={18} color={p.accent} />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Outfit-Medium",
                        color: p.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Role
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Outfit-SemiBold",
                        color: p.textPrimary,
                        marginTop: 2,
                      }}
                    >
                      {(appRole ?? "athlete").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: p.cardWhite,
                      borderRadius: 20,
                      padding: 16,
                      borderCurve: "continuous",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: p.inputBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Calendar size={18} color={p.accent} />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Outfit-Medium",
                        color: p.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      Status
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Outfit-SemiBold",
                        color: p.textPrimary,
                        marginTop: 2,
                      }}
                    >
                      Active
                    </Text>
                  </View>
                </Animated.View>

                {/* Name Input Card */}
                <Animated.View
                  entering={FadeInDown.springify().damping(18).delay(200)}
                  style={{
                    backgroundColor: p.cardWhite ?? "#fff",
                    borderRadius: CARD_R,
                    padding: 20,
                    borderCurve: "continuous",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Outfit-SemiBold",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#555",
                      marginBottom: 10,
                      marginLeft: 4,
                    }}
                  >
                    Full Name
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: p.inputBg,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      height: 54,
                      borderCurve: "continuous",
                    }}
                  >
                    <User size={18} color={p.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontFamily: "Outfit",
                        color: "#1a1a1a",
                      }}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor="#999"
                    />
                  </View>
                </Animated.View>

                {/* Email Input Card */}
                <Animated.View
                  entering={FadeInDown.springify().damping(18).delay(250)}
                  style={{
                    backgroundColor: p.cardWhite ?? "#fff",
                    borderRadius: CARD_R,
                    padding: 20,
                    borderCurve: "continuous",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Outfit-SemiBold",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#555",
                      marginBottom: 10,
                      marginLeft: 4,
                    }}
                  >
                    Email Address
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: p.inputBg,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      height: 54,
                      borderCurve: "continuous",
                      opacity: 0.8,
                    }}
                  >
                    <Mail size={18} color={p.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontFamily: "Outfit",
                        color: "#444",
                      }}
                      value={email}
                      editable={false}
                    />
                    <Lock size={14} color="#888" style={{ marginLeft: 8 }} />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Outfit",
                      color: "#888",
                      marginTop: 8,
                      marginLeft: 4,
                    }}
                  >
                    Email cannot be changed. Contact support if needed.
                  </Text>
                </Animated.View>

                {/* Managed Athletes */}
                {appRole !== "coach" && apiUserRole !== "admin" && apiUserRole !== "superAdmin" && (
                  <Animated.View entering={FadeInDown.springify().damping(18).delay(300)}>
                    <ManagedAthletesSection
                      managedAthletes={managedAthletes}
                      managedAthleteCount={managedAthleteCount}
                    />
                  </Animated.View>
                )}

                {/* Save Button */}
                <Animated.View entering={FadeInDown.springify().damping(18).delay(350)}>
                  <Pressable
                    onPress={() => {
                      if (!hasChanges) return;
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      handleSave();
                    }}
                    disabled={isSaving || !hasChanges}
                    style={({ pressed }) => ({
                      opacity: isSaving || !hasChanges ? 0.5 : pressed ? 0.85 : 1,
                      transform: [
                        {
                          scale:
                            pressed && hasChanges && !isSaving ? 0.97 : 1,
                        },
                      ],
                    })}
                  >
                    <LinearGradient
                      colors={hasChanges ? [p.accent, p.accent] : ["#3a3a3a", "#2a2a2a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        height: 56,
                        borderRadius: 100,
                        borderCurve: "continuous",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        shadowColor: hasChanges ? p.accent : "transparent",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: hasChanges ? 0.25 : 0,
                        shadowRadius: 12,
                        elevation: hasChanges ? 4 : 0,
                      }}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Save size={18} color="#fff" />
                      )}
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 16,
                          fontFamily: "Outfit-SemiBold",
                        }}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
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
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
          onPress={() => setPendingAvatarUri(null)}
        >
          <Pressable
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: CARD_R,
              borderCurve: "continuous",
              backgroundColor: p.cardWhite ?? "#fff",
              padding: 24,
              alignItems: "center",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
                marginBottom: 8,
              }}
            >
              Use this photo?
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Outfit",
                color: p.textSecondary,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              This will be visible across your profile.
            </Text>

            {pendingAvatarUri ? (
              <View
                style={{
                  marginBottom: 32,
                  borderRadius: 50,
                  borderCurve: "continuous",
                  overflow: "hidden",
                  borderWidth: 4,
                  borderColor: p.inputBg,
                }}
              >
                <Image
                  source={{ uri: pendingAvatarUri }}
                  style={{ width: 140, height: 140 }}
                />
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                width: "100%",
              }}
            >
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 100,
                  borderCurve: "continuous",
                  backgroundColor: p.inputBg,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setPendingAvatarUri(null)}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-Medium",
                    color: p.textPrimary,
                    fontSize: 15,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 100,
                  borderCurve: "continuous",
                  backgroundColor: p.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isUploadingAvatar ? 0.5 : pressed ? 0.8 : 1,
                })}
                disabled={isUploadingAvatar}
                onPress={handleConfirmAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      color: "#fff",
                      fontSize: 15,
                    }}
                  >
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
