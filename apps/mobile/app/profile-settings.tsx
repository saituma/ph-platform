import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRefreshContext } from "@/context/RefreshContext";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@/components/ui/theme-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateProfile } from "@/store/slices/userSlice";
import { Text, TextInput } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { registerDevicePushToken } from "@/lib/pushRegistration";
import { Shadows } from "@/constants/theme";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { role } = useRole();
  const { colors, isDark } = useAppTheme();
  const { isLoading } = useRefreshContext();
  const { profile, token } = useAppSelector((state) => state.user);
  const pushRegistration = useAppSelector((state) => state.app.pushRegistration);
  const { isSectionHidden } = useAgeExperience();
  const dispatch = useAppDispatch();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [managedAthleteCount, setManagedAthleteCount] = useState(0);
  const [isManagedAthleteModalVisible, setIsManagedAthleteModalVisible] = useState(false);
  const [managedAthletes, setManagedAthletes] = useState<
    {
      id?: number;
      name?: string | null;
      age?: number | null;
      team?: string | null;
      level?: string | null;
      trainingPerWeek?: number | null;
      performanceGoals?: string | null;
      equipmentAccess?: string | null;
      injuries?: string | null;
      extraResponses?: string | null;
      profilePicture?: string | null;
    }[]
  >([]);
  const [, setManagedAthlete] = useState<{
    id?: number;
    name?: string | null;
    age?: number | null;
    team?: string | null;
    level?: string | null;
    trainingPerWeek?: number | null;
    performanceGoals?: string | null;
    equipmentAccess?: string | null;
    injuries?: string | null;
    extraResponses?: string | null;
    profilePicture?: string | null;
  } | null>(null);

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState("");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);

  useEffect(() => {
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
  }, [profile.name, profile.email]);

  useEffect(() => {
    void (async () => {
      if (!token) return;
      const result = await registerDevicePushToken({
        token,
        dispatch,
        requestPermission: false,
      });
      if (result.expoPushToken) {
        setPushToken(result.expoPushToken);
      }
    })();
  }, [dispatch, token]);

  useEffect(() => {
    let active = true;
    const loadAthlete = async () => {
      if (!token || role !== "Guardian") {
        if (active) setManagedAthleteCount(0);
        return;
      }
      try {
        const data = await apiRequest<{
          guardian?: { activeAthleteId?: number | null } | null;
          athletes?: {
            id?: number;
            name?: string | null;
            age?: number | null;
            team?: string | null;
            level?: string | null;
            trainingPerWeek?: number | null;
            performanceGoals?: string | null;
            equipmentAccess?: string | null;
            injuries?: string | null;
            extraResponses?: string | null;
            profilePicture?: string | null;
          }[];
        }>("/onboarding/athletes", { token });
        if (!active) return;
        const athleteList = data.athletes ?? [];
        setManagedAthletes(athleteList);
        const activeAthlete =
          athleteList.find((item) => item.id === data.guardian?.activeAthleteId) ?? athleteList[0] ?? null;
        setManagedAthlete(activeAthlete ?? null);
        setActiveAthleteId(activeAthlete?.id ?? null);
        setManagedAthleteCount(athleteList.length);
      } catch {
        if (!active) return;
        setManagedAthlete(null);
        setManagedAthleteCount(0);
        setManagedAthletes([]);
      }
    };
    loadAthlete();
    return () => {
      active = false;
    };
  }, [role, token]);

  // BUG-20: Load athlete details (height, weight, position) from the server
  useEffect(() => {
    if (!token || !activeAthleteId) return;
    let active = true;
    (async () => {
      try {
        const data = await apiRequest<{
          athlete?: {
            height?: string | null;
            weight?: string | null;
            position?: string | null;
          } | null;
        }>(`/onboarding/athletes/${activeAthleteId}`, {
          token,
          suppressStatusCodes: [401, 403, 404],
        });
        if (!active) return;
        if (data.athlete) {
          setHeight(data.athlete.height ?? "");
          setWeight(data.athlete.weight ?? "");
          setPosition(data.athlete.position ?? "");
        }
      } catch {
        // Fields stay empty if we can't load — that's fine
      }
    })();
    return () => { active = false; };
  }, [token, activeAthleteId]);

  if (isSectionHidden("settings")) {
    return <AgeGate title="Settings locked" message="Settings are restricted for this age." />;
  }

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  const uploadAvatar = async (uri: string) => {
    if (!token) throw new Error("Authentication required");
    const fileName = uri.split("/").pop() ?? `avatar-${Date.now()}.jpg`;
    const contentType = "image/jpeg";
    const blob = await (await fetch(uri)).blob();
    const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
      method: "POST",
      token,
      body: {
        folder: "profile-photos",
        fileName,
        contentType,
        sizeBytes: blob.size,
      },
    });
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    return presign.publicUrl;
  };

  const handlePickAvatar = async () => {
    if (!token || isUploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const mediaTypes =
      (ImagePicker as any).MediaType?.Images
        ? [(ImagePicker as any).MediaType.Images]
        : (ImagePicker as any).MediaTypeOptions?.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPendingAvatarUri(result.assets[0].uri);
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatarUri || !token || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(pendingAvatarUri);
      const response = await apiRequest<{ user: { profilePicture?: string | null } }>("/auth/me", {
        method: "PATCH",
        token,
        body: { profilePicture: publicUrl },
      });
      dispatch(updateProfile({ avatar: response.user.profilePicture ?? publicUrl }));
      setPendingAvatarUri(null);
    } catch (error) {
      console.warn("Failed to update avatar", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleTestPush = async () => {
    if (!token || isSendingTestPush) return;
    setIsSendingTestPush(true);
    try {
      await apiRequest("/notifications/test-push", { method: "POST", token });
      Alert.alert("Success", "Test notification sent! It should arrive in a few seconds.");
    } catch (err: any) {
      Alert.alert("Test Push Failed", err.message);
    } finally {
      setIsSendingTestPush(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Profile Information"
        subtitle="Fine-tune identity details, update your avatar, and keep your account polished."
        badge="Profile"
      />

      <ThemedScrollView
        onRefresh={handleRefresh}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
      >
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <View className="gap-6">
            <View
              className="bg-input rounded-3xl p-6 shadow-sm border border-app"
              style={isDark ? Shadows.none : Shadows.sm}
            >
              <View className="flex-row items-center gap-4 mb-6">
                <View className="relative">
                  {profile.avatar ? (
                    <View className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent">
                      <Image source={{ uri: profile.avatar }} style={{ width: 80, height: 80 }} />
                    </View>
                  ) : (
                    <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center border-2 border-accent">
                      <Feather name="user" size={40} color={colors.textSecondary} />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={handlePickAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full items-center justify-center border-2 border-white"
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Feather name="camera" size={14} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-3 mb-1">
                    <View className="h-4 w-1 rounded-full bg-accent" />
                    <Text className="text-lg font-bold font-clash text-app">
                      Profile Details
                    </Text>
                  </View>
                  <Text className="text-secondary font-outfit text-sm">
                    Manage your identity and avatar.
                  </Text>
                </View>
              </View>

              <View className="gap-4">
                <InputField
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  icon="user"
                />
                <InputField
                  label="Email Address"
                  value={email}
                  editable={false}
                  icon="mail"
                />
              </View>
            </View>

            {role === "Guardian" && (
              <View
                className="bg-input rounded-3xl p-6 shadow-sm border border-app"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <SectionHeader
                  title="Guardian Settings"
                  subtitle="Manage your household settings."
                  icon="shield"
                  iconColor="text-blue-500"
                />

                <TouchableOpacity
                  onPress={() => setIsManagedAthleteModalVisible(true)}
                  className="flex-row items-center justify-between py-4 border-t border-app"
                >
                  <Text className="text-base font-medium font-outfit text-app">
                    Managed Athletes
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-accent font-medium mr-2">
                      {managedAthleteCount} Active
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {role === "Athlete" && (
              <View
                className="bg-input rounded-3xl p-6 shadow-sm border border-app"
                style={isDark ? Shadows.none : Shadows.sm}
              >
                <SectionHeader
                  title="Player Details"
                  subtitle="Your physical and field parameters."
                  icon="activity"
                  iconColor="text-green-500"
                />

                <View className="gap-4">
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <InputField
                        label="Height"
                        value={height}
                        onChangeText={setHeight}
                        placeholder="e.g. 180 cm"
                      />
                    </View>
                    <View className="flex-1">
                      <InputField
                        label="Weight"
                        value={weight}
                        onChangeText={setWeight}
                        placeholder="e.g. 75 kg"
                      />
                    </View>
                  </View>
                  <InputField
                    label="Preferred Position"
                    value={position}
                    onChangeText={setPosition}
                    icon="map-pin"
                  />
                  <TouchableOpacity
                    onPress={() => Alert.alert("Coming Soon", "Emergency contact management will be available in a future update.")}
                    className="flex-row items-center justify-between py-4 border-t border-app"
                  >
                    <Text className="text-base font-medium font-outfit text-app">
                      Emergency Contact
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ActionButton
              label={isSaving ? "Saving..." : "Save Changes"}
              icon="check"
              color="bg-accent"
              iconColor="text-white"
              onPress={async () => {
                if (!token || isSaving) return;
                setIsSaving(true);
                try {
                  // Save name to user profile
                  if (name !== profile.name) {
                    const response = await apiRequest<{ user: { name?: string | null; profilePicture?: string | null } }>("/auth/me", {
                      method: "PATCH",
                      token,
                      body: { name },
                    });
                    dispatch(updateProfile({ name: response.user.name ?? name }));
                  }
                  // Save athlete-specific fields if we have an athlete ID
                  if (activeAthleteId && role === "Athlete") {
                    await apiRequest(`/onboarding/athletes/${activeAthleteId}`, {
                      method: "PATCH",
                      token,
                      body: { height, weight, position },
                      suppressStatusCodes: [404],
                    });
                  }
                  Alert.alert("Success", "Your changes have been saved.");
                } catch (err: any) {
                  Alert.alert("Save Failed", err.message ?? "Something went wrong.");
                } finally {
                  setIsSaving(false);
                }
              }}
              fullWidth={true}
            />

            <View
              className="bg-input rounded-3xl p-6 shadow-sm border border-app mt-4"
              style={isDark ? Shadows.none : Shadows.sm}
            >
              <SectionHeader
                title="Debug & Notifications"
                subtitle="Verify push notification status."
                icon="bell"
                iconColor="text-orange-500"
              />
              
              <View className="gap-4">
                <View>
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Push Support</Text>
                  <View className="bg-app border border-app rounded-xl p-3">
                    <Text className="text-[11px] font-mono text-secondary">
                      {pushRegistration.support}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Permission</Text>
                  <View className="bg-app border border-app rounded-xl p-3">
                    <Text className="text-[11px] font-mono text-secondary">
                      {pushRegistration.permissionStatus}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Expo Project ID</Text>
                  <View className="bg-app border border-app rounded-xl p-3">
                    <Text className="text-[11px] font-mono text-secondary" numberOfLines={2}>
                      {pushRegistration.projectId || "Missing"}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Expo Push Token</Text>
                  <View className="bg-app border border-app rounded-xl p-3">
                    <Text className="text-[11px] font-mono text-secondary" numberOfLines={2}>
                      {pushToken || pushRegistration.expoPushToken || "Token not available (check permissions)"}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.5px] font-bold mb-2">Last Sync State</Text>
                  <View className="bg-app border border-app rounded-xl p-3">
                    <Text className="text-[11px] font-mono text-secondary" numberOfLines={3}>
                      {pushRegistration.lastError
                        ? `Error: ${pushRegistration.lastError}`
                        : pushRegistration.lastSyncedAt
                        ? `Synced at ${pushRegistration.lastSyncedAt}`
                        : pushRegistration.lastAttemptAt
                        ? `Attempted at ${pushRegistration.lastAttemptAt}`
                        : "Not attempted"}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleTestPush}
                  disabled={isSendingTestPush}
                  className="rounded-2xl border border-app py-4 flex-row items-center justify-center gap-2"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC" }}
                >
                  {isSendingTestPush ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Feather name="send" size={16} color={colors.accent} />
                  )}
                  <Text className="text-sm font-outfit font-bold text-accent uppercase tracking-wider">
                    {isSendingTestPush ? "Sending..." : "Send Test Push"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ThemedScrollView>

      <Modal
        visible={isManagedAthleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsManagedAthleteModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setIsManagedAthleteModalVisible(false)}
        >
          <Pressable className="w-full rounded-3xl bg-app p-6 border border-app" onPress={() => undefined}>
            <Text className="text-lg font-clash text-app mb-2">Managed Athletes</Text>
            <Text className="text-sm font-outfit text-secondary mb-4">
              Review the athlete profiles managed by this account.
            </Text>
            {managedAthletes.length ? (
              <View className="gap-3">
                {managedAthletes.map((athlete, index) => (
                  <View key={athlete.id ?? athlete.name ?? `athlete-${index}`} className="gap-3">
                    <View className="flex-row items-center gap-3">
                      {athlete.profilePicture ? (
                        <View className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent">
                          <Image source={{ uri: athlete.profilePicture }} style={{ width: 56, height: 56 }} />
                        </View>
                      ) : (
                        <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center border-2 border-accent">
                          <Feather name="user" size={26} color={colors.textSecondary} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold font-outfit text-app">
                          {athlete.name ?? "Athlete"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          {athlete.team ?? "Team not set"} • {athlete.level ?? "Level not set"}
                        </Text>
                      </View>
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-outfit text-app">
                        Age: {athlete.age ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Training days: {athlete.trainingPerWeek ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Goals: {athlete.performanceGoals ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Equipment: {athlete.equipmentAccess ?? "—"}
                      </Text>
                      <Text className="text-sm font-outfit text-app">
                        Injuries: {athlete.injuries ?? "—"}
                      </Text>
                    </View>
                    <View className="h-px bg-border/60" />
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-sm font-outfit text-secondary">
                No athlete profile found for this account.
              </Text>
            )}
            <TouchableOpacity
              onPress={() => setIsManagedAthleteModalVisible(false)}
              className="mt-6 rounded-2xl bg-accent py-3 items-center"
            >
              <Text className="text-sm font-outfit text-white">Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(pendingAvatarUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAvatarUri(null)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={() => setPendingAvatarUri(null)}
        >
          <Pressable className="w-full rounded-3xl bg-app p-6 border border-app" onPress={() => undefined}>
            <Text className="text-lg font-clash text-app mb-2">Use this photo?</Text>
            <Text className="text-sm font-outfit text-secondary mb-4">
              Confirm your cropped profile picture.
            </Text>
            {pendingAvatarUri ? (
              <View className="items-center mb-6">
                <View className="h-32 w-32 rounded-full overflow-hidden border-2 border-accent">
                  <Image source={{ uri: pendingAvatarUri }} style={{ width: 128, height: 128 }} />
                </View>
              </View>
            ) : null}
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => setPendingAvatarUri(null)}
                className="flex-1 rounded-2xl border border-app py-3 items-center"
              >
                <Text className="text-sm font-outfit text-secondary">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAvatar}
                disabled={isUploadingAvatar}
                className="flex-1 rounded-2xl bg-accent py-3 items-center"
                style={{ opacity: isUploadingAvatar ? 0.6 : 1 }}
              >
                <Text className="text-sm font-outfit text-white">
                  {isUploadingAvatar ? "Uploading..." : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  placeholder?: string;
  icon?: any;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold font-outfit text-secondary ml-1">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-app border border-app rounded-2xl h-14 px-4 ${!editable ? "opacity-60" : ""}`}
      >
        {icon && (
          <View className="h-8 w-8 rounded-xl bg-secondary items-center justify-center mr-3">
            <Feather name={icon} size={16} className="text-accent" />
          </View>
        )}
        <TextInput
          className="flex-1 text-app font-outfit text-base"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
        />
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor,
}: {
  title: string;
  subtitle: string;
  icon: any;
  iconColor: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row items-center gap-4 mb-6">
      <View className="w-12 h-12 bg-secondary/10 rounded-2xl items-center justify-center">
        <Feather name={icon} size={20} color={colors.text} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="h-4 w-1 rounded-full bg-accent" />
          <Text className="text-lg font-bold font-clash text-app leading-tight">
            {title}
          </Text>
        </View>
        <Text className="text-secondary font-outfit text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View className="gap-6">
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-6">
          <Skeleton circle width={72} height={72} />
          <View className="flex-1 gap-2">
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={16} />
          </View>
        </View>
        <View className="flex-row items-center gap-3 mb-4">
          <Skeleton width={4} height={16} borderRadius={2} />
          <Skeleton width="35%" height={18} />
        </View>
        <View className="gap-4">
          <Skeleton width="100%" height={56} borderRadius={16} />
          <Skeleton width="100%" height={56} borderRadius={16} />
        </View>
      </View>
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-5">
          <Skeleton width={48} height={48} borderRadius={16} />
          <View className="flex-1 gap-2">
            <Skeleton width="50%" height={20} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        <Skeleton width="100%" height={60} borderRadius={16} />
      </View>
    </View>
  );
}
