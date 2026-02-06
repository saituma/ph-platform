import { ActionButton } from "@/components/dashboard/ActionButton";
import { PinModal } from "@/components/PinModal";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useRefreshContext } from "@/context/RefreshContext";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { role, guardianPin, setGuardianPin } = useRole();
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const { isLoading } = useRefreshContext();

  const [name, setName] = useState("John Doe");
  const [email] = useState("john.doe@example.com");
  const [height, setHeight] = useState("180 cm");
  const [weight, setWeight] = useState("75 kg");
  const [position, setPosition] = useState("Forward");

  const handleSetPin = (pin: string) => {
    setGuardianPin(pin);
    setIsPinModalVisible(false);
  };

  const handleTogglePin = (value: boolean) => {
    if (value) {
      setIsPinModalVisible(true);
    } else {
      setGuardianPin(null);
    }
  };

  const handleRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Refreshed Profile Settings");
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 bg-input border-b border-app flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
          className="w-10 h-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-lg font-bold font-clash text-app">
          Profile Information
        </Text>
        <View className="w-10" />
      </View>

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
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="bg-input rounded-3xl p-6 shadow-sm border border-app"
            >
              <View className="flex-row items-center gap-4 mb-6">
                <View className="relative">
                  <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center border-2 border-accent">
                    <Feather name="user" size={40} className="text-secondary" />
                  </View>
                  <TouchableOpacity className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full items-center justify-center border-2 border-white">
                    <Feather name="camera" size={14} color="white" />
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold font-clash text-app">
                    Profile Details
                  </Text>
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
            </Animated.View>

            {role === "Guardian" && (
              <Animated.View
                entering={FadeInDown.delay(200).springify()}
                className="bg-input rounded-3xl p-6 shadow-sm border border-app"
              >
                <SectionHeader
                  title="Guardian Security"
                  subtitle="Protect sensitive settings with a PIN."
                  icon="shield"
                  iconColor="text-blue-500"
                />

                <View className="flex-row items-center justify-between py-4 border-t border-app">
                  <View className="flex-1 mr-4">
                    <Text className="text-base font-semibold font-outfit text-app mb-1">
                      Enable PIN Protection
                    </Text>
                    <Text className="text-muted font-outfit text-xs leading-relaxed">
                      Require a PIN when switching roles.
                    </Text>
                  </View>
                  <Switch
                    value={!!guardianPin}
                    onValueChange={handleTogglePin}
                    trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
                    thumbColor={"#ffffff"}
                  />
                </View>

                {guardianPin && (
                  <TouchableOpacity
                    onPress={() => setIsPinModalVisible(true)}
                    className="flex-row items-center justify-between py-4 border-t border-app mt-2"
                  >
                    <Text className="text-base font-medium font-outfit text-app">
                      Change PIN
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={20}
                      className="text-muted"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {}}
                  className="flex-row items-center justify-between py-4 border-t border-app"
                >
                  <Text className="text-base font-medium font-outfit text-app">
                    Managed Athletes
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-accent font-medium mr-2">
                      2 Active
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={20}
                      className="text-muted"
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}

            {role === "Athlete" && (
              <Animated.View
                entering={FadeInDown.delay(200).springify()}
                className="bg-input rounded-3xl p-6 shadow-sm border border-app"
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
                    onPress={() => {}}
                    className="flex-row items-center justify-between py-4 border-t border-app"
                  >
                    <Text className="text-base font-medium font-outfit text-app">
                      Emergency Contact
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={20}
                      className="text-muted"
                    />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            <ActionButton
              label="Save Changes"
              icon="check"
              color="bg-accent"
              iconColor="text-white"
              onPress={() => router.navigate("/(tabs)/more")}
              fullWidth={true}
            />
          </View>
        )}
      </ThemedScrollView>

      <PinModal
        visible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handleSetPin}
        title="Set Guardian PIN"
        subtitle="Create a 4-digit PIN to protect your settings."
      />
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
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold font-outfit text-secondary ml-1">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-app border border-app rounded-2xl h-14 px-4 ${!editable ? "opacity-60" : ""}`}
      >
        {icon && (
          <Feather name={icon} size={18} className="text-secondary mr-3" />
        )}
        <TextInput
          className="flex-1 text-app font-outfit text-base"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
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
  return (
    <View className="flex-row items-center gap-4 mb-6">
      <View
        className={`w-14 h-14 bg-secondary/10 rounded-2xl items-center justify-center`}
      >
        <Feather name={icon} size={24} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold font-clash text-app leading-tight mb-1">
          {title}
        </Text>
        <Text className="text-secondary font-outfit text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View className="gap-6">
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-8">
          <Skeleton circle width={80} height={80} />
          <View className="flex-1 gap-2">
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={16} />
          </View>
        </View>
        <View className="gap-4">
          <Skeleton width="100%" height={56} borderRadius={16} />
          <Skeleton width="100%" height={56} borderRadius={16} />
        </View>
      </View>
      <View className="bg-input rounded-3xl p-6 shadow-sm border border-app">
        <View className="flex-row items-center gap-4 mb-6">
          <Skeleton width={56} height={56} borderRadius={16} />
          <View className="flex-1 gap-2">
            <Skeleton width="50%" height={20} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>
        <Skeleton width="100%" height={60} borderRadius={12} />
      </View>
    </View>
  );
}
