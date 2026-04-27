import { ActionButton } from "@/components/dashboard/ActionButton";
import { Text } from "@/components/ScaledText";
import { AvatarSection } from "@/components/more/profile/AvatarSection";
import { useProfileSettings } from "@/components/more/profile/hooks/useProfileSettings";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/userSlice";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function TeamManagerProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useAppSafeAreaInsets();
  const { isAuthenticated, appRole } = useAppSelector((s) => s.user);

  const {
    profile,
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

  const transition = useSharedValue(0);
  useEffect(() => {
    transition.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [transition]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: transition.value,
    transform: [{ translateY: (1 - transition.value) * 12 }],
  }));

  const handleLogout = useCallback(() => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          dispatch(logout());
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, [dispatch, router]);

  const handleRefresh = async () => {
    await new Promise((r) => setTimeout(r, 800));
  };

  if (appRole !== "team_manager") return null;

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : colors.card;
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const textPrimary = isDark ? "hsl(220,5%,94%)" : "hsl(220,8%,10%)";
  const textSecondary = isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,48%)";

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 24,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
              marginRight: 16,
            }}
          >
            <View
              style={{
                height: 24,
                width: 6,
                borderRadius: 99,
                backgroundColor: colors.accent,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 36,
                fontFamily: "TelmaBold",
                color: textPrimary,
                letterSpacing: -0.3,
              }}
            >
              Profile
            </Text>
          </View>
          <ThemeToggle size={58} iconSize={28} />
        </View>

        {/* Profile card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              overflow: "hidden",
              borderRadius: 24,
              borderWidth: 1,
              paddingHorizontal: 20,
              paddingVertical: 20,
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              {profile.avatar ? (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: cardBorder,
                  }}
                >
                  <Image
                    source={{ uri: profile.avatar }}
                    style={{ width: 64, height: 64 }}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? `${colors.accent}18`
                      : `${colors.accent}14`,
                    borderWidth: 1,
                    borderColor: isDark
                      ? `${colors.accent}30`
                      : `${colors.accent}20`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: "ClashDisplay-Bold",
                      color: colors.accent,
                    }}
                  >
                    {(profile.name?.charAt(0) ?? "T").toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    backgroundColor: isDark
                      ? `${colors.accent}18`
                      : `${colors.accent}12`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: fonts.bodyBold,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      color: colors.accent,
                    }}
                  >
                    Team Manager
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 20,
                    fontFamily: "ClashDisplay-Bold",
                    color: textPrimary,
                  }}
                >
                  {profile.name || "Team Manager"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontFamily: fonts.bodyMedium,
                    color: textSecondary,
                  }}
                >
                  {profile.email ||
                    (isAuthenticated ? "Email unavailable" : "Not signed in")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Animated.View style={[{ paddingHorizontal: 24, gap: 24 }, fadeStyle]}>
          {/* Edit Profile */}
          <SectionGroup
            label="Edit Profile"
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <View style={{ padding: 20 }}>
              <AvatarSection
                avatar={profile.avatar ?? null}
                name={name}
                setName={setName}
                email={email}
                isUploadingAvatar={isUploadingAvatar}
                onPickAvatar={handlePickAvatar}
                pendingAvatarUri={pendingAvatarUri}
                onCancelPending={() => setPendingAvatarUri(null)}
                onConfirmPending={handleConfirmAvatar}
              />
              <View style={{ marginTop: 16 }}>
                <ActionButton
                  label={isSaving ? "Saving…" : "Save Changes"}
                  icon="check"
                  color="bg-accent"
                  iconColor="text-white"
                  onPress={handleSave}
                  fullWidth
                  size="xl"
                />
              </View>
            </View>
          </SectionGroup>

          {/* Account */}
          <SectionGroup
            label="Account"
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <MenuItem
              icon="lock-closed-outline"
              label="Privacy & Security"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.navigate("/privacy-security")}
            />
            <MenuItem
              icon="shield-outline"
              label="Permissions"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.navigate("/permissions")}
            />
            <MenuItem
              icon="information-circle-outline"
              label="About App"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              isLast
              onPress={() => router.push("/about")}
            />
          </SectionGroup>

          {/* Support */}
          <SectionGroup
            label="Support"
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            labelColor={labelColor}
          >
            <MenuItem
              icon="help-circle-outline"
              label="Help Center"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.push("/help-center")}
            />
            <MenuItem
              icon="chatbox-outline"
              label="Send Feedback"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.push("/feedback")}
            />
            <MenuItem
              icon="document-text-outline"
              label="Terms of Service"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              onPress={() => router.navigate("/terms")}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              isDark={isDark}
              accent={colors.accent}
              cardBorder={cardBorder}
              isLast
              onPress={() => router.navigate("/privacy-policy")}
            />
          </SectionGroup>

          {/* Sign Out */}
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 16,
              backgroundColor: isDark
                ? "hsl(0, 20%, 16%)"
                : "hsl(0, 25%, 94%)",
              borderWidth: 1,
              borderColor: isDark
                ? "hsl(0, 20%, 28%)"
                : "hsl(0, 25%, 82%)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={isDark ? "hsl(0, 35%, 60%)" : "hsl(0, 40%, 48%)"}
            />
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 15,
                color: isDark ? "hsl(0, 35%, 60%)" : "hsl(0, 40%, 48%)",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </Animated.View>
      </ThemedScrollView>
    </View>
  );
}

// ── SectionGroup ───────────────────────────────────────────────────────────

function SectionGroup({
  label,
  children,
  isDark,
  cardBg,
  cardBorder,
  labelColor,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4 }}>
        <View
          style={{
            height: 16,
            width: 4,
            borderRadius: 99,
            backgroundColor: isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,65%)",
          }}
        />
        <Text
          style={{
            fontSize: 11,
            fontFamily: fonts.bodyBold,
            color: labelColor,
            textTransform: "uppercase",
            letterSpacing: 1.0,
          }}
        >
          {label}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: cardBorder,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ── MenuItem ───────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  isDark,
  accent,
  cardBorder,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isDark: boolean;
  accent: string;
  cardBorder: string;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        backgroundColor: pressed
          ? isDark
            ? "rgba(255,255,255,0.04)"
            : "rgba(15,23,42,0.03)"
          : "transparent",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: cardBorder,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? `${accent}18` : `${accent}14`,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.bodyBold,
          fontSize: 15,
          color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)",
        }}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={17}
        color={isDark ? "hsl(220,5%,35%)" : "hsl(220,5%,60%)"}
      />
    </Pressable>
  );
}
