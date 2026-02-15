import { ActionButton } from "@/components/dashboard/ActionButton";
import { PinModal } from "@/components/PinModal";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useAppLock } from "@/context/AppLockContext";

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { profile } = useAppSelector((state) => state.user);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isRecoverySetupVisible, setIsRecoverySetupVisible] = useState(false);
  const [recoveryQuestionInput, setRecoveryQuestionInput] = useState("");
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState("");
  const {
    enabled: appLockEnabled,
    pin: appLockPin,
    autoLockInterval,
    setEnabled,
    setPin,
    setRecovery,
    setAutoLockInterval,
  } = useAppLock();

  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      await setEnabled(true);
      setIsPinModalVisible(true);
    } else {
      await setEnabled(false);
      await setPin(null);
      await setRecovery(null, null);
    }
  };

  const handleSetPin = async (pin: string) => {
    await setPin(pin);
    await setEnabled(true);
    setIsPinModalVisible(false);
    if (!recoveryQuestionInput || !recoveryAnswerInput) {
      setIsRecoverySetupVisible(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-app">
        <TouchableOpacity
          onPress={() => router.navigate("/(tabs)/more")}
          className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
        >
          <Feather name="arrow-left" size={20} className="text-app" />
        </TouchableOpacity>
        <Text className="text-xl font-clash text-app font-bold">
          Privacy & Security
        </Text>
        <View className="w-10" />
      </View>

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <Text className="text-3xl font-clash text-app">
              Account Safety
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Manage your data, passwords, and two-factor authentication.
          </Text>
        </View>

        <View
          className="bg-input rounded-[32px] overflow-hidden border border-app shadow-sm mb-6"
          style={
            isDark
              ? undefined
              : {
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }
          }
        >
          <SecurityLink
            label="Change Password"
            icon="key"
            onPress={() => router.navigate("/(auth)/forgot")}
          />
          <SecurityLink
            label="Two-Factor Authentication"
            icon="shield"
            onPress={() => {}}
          />
          <SecurityLink
            label="Authorized Devices"
            icon="tablet"
            onPress={() => {}}
          />
          <SecurityLink
            label="Download My Data"
            icon="download"
            onPress={() => {}}
            isLast
          />
        </View>

        <View
          className="bg-input rounded-[32px] overflow-hidden border border-app shadow-sm mb-6 p-6"
          style={
            isDark
              ? undefined
              : {
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }
          }
        >
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-bold font-clash text-app">
                Login Auth
              </Text>
              <Text className="text-xs font-outfit text-secondary">
                Require PIN to open the app.
              </Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={handleToggleAppLock}
            />
          </View>
          <View className="border-t border-app pt-4">
            <Text className="text-sm font-bold font-outfit text-secondary mb-3">
              Auto Lock Interval
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(["Immediately", "1 min", "5 min", "15 min", "30 min"] as const).map(
                (value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setAutoLockInterval(value)}
                    className={`px-3 py-2 rounded-full border ${
                      autoLockInterval === value ? "bg-accent border-accent" : "border-app"
                    }`}
                  >
                    <Text
                      className={`text-xs font-outfit ${
                        autoLockInterval === value ? "text-white" : "text-secondary"
                      }`}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>

        <View
          className="bg-red-50 dark:bg-red-950/20 rounded-[32px] overflow-hidden border border-red-100 dark:border-red-900/30 p-2 mb-8"
          style={
            isDark
              ? undefined
              : {
                  shadowColor: "#0F172A",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }
          }
        >
          <SecurityLink
            label="Delete Account"
            icon="trash-2"
            onPress={() => {}}
            isLast
            color="text-danger"
          />
        </View>

        <ActionButton
          label="Close"
          onPress={() => router.navigate("/(tabs)/more")}
          color="bg-secondary"
          icon="x"
          fullWidth={true}
        />
      </ThemedScrollView>

      <PinModal
        visible={isPinModalVisible}
        onClose={() => {
          setIsPinModalVisible(false);
          if (!appLockPin) {
            setEnabled(false);
          }
        }}
        onSuccess={handleSetPin}
        title="Set App Lock PIN"
        subtitle={`Protect ${profile.email ?? "your account"} with a 4-digit PIN.`}
      />
      <Modal visible={isRecoverySetupVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-input w-full max-w-sm rounded-[28px] p-6">
            <Text className="text-lg font-clash text-app font-bold mb-2">
              Set Recovery Question
            </Text>
            <Text className="text-secondary font-outfit text-sm mb-4">
              This helps you reset your PIN if you forget it.
            </Text>
            <TouchableOpacity className="mb-3">
              <Text className="text-xs font-outfit text-secondary">
                Example: What is your favorite team?
              </Text>
            </TouchableOpacity>
            <View className="bg-app border border-app rounded-2xl h-12 px-4 mb-3 justify-center">
              <TextInput
                className="text-app font-outfit"
                placeholder="Recovery question"
                placeholderTextColor="#7C7C7C"
                value={recoveryQuestionInput}
                onChangeText={setRecoveryQuestionInput}
              />
            </View>
            <View className="bg-app border border-app rounded-2xl h-12 px-4 mb-4 justify-center">
              <TextInput
                className="text-app font-outfit"
                placeholder="Answer"
                placeholderTextColor="#7C7C7C"
                value={recoveryAnswerInput}
                onChangeText={setRecoveryAnswerInput}
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setIsRecoverySetupVisible(false);
                  setRecoveryQuestionInput("");
                  setRecoveryAnswerInput("");
                }}
                className="flex-1 h-12 items-center justify-center rounded-xl bg-secondary border border-app"
              >
                <Text className="text-app font-outfit font-semibold">
                  Skip
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!recoveryQuestionInput || !recoveryAnswerInput) return;
                  await setRecovery(recoveryQuestionInput, recoveryAnswerInput);
                  setIsRecoverySetupVisible(false);
                }}
                className="flex-1 h-12 items-center justify-center rounded-xl bg-accent"
              >
                <Text className="text-white font-outfit font-semibold">
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SecurityLink({
  label,
  onPress,
  icon,
  isLast = false,
  color = "text-app",
}: {
  label: string;
  onPress: () => void;
  icon: any;
  isLast?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center p-5 active:bg-secondary ${!isLast ? "border-b border-app" : ""}`}
    >
      <View className="w-10 h-10 items-center justify-center bg-secondary rounded-2xl mr-4">
        <Feather name={icon} size={16} className={color} />
      </View>
      <Text className={`flex-1 font-outfit text-base font-bold ${color}`}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} className="text-secondary" />
    </TouchableOpacity>
  );
}
