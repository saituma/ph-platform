import React, { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PinModal } from "@/components/PinModal";
import { useAppLock } from "@/context/AppLockContext";
import { useAppSelector } from "@/store/hooks";

export function AppLockGate() {
  const {
    enabled,
    pin,
    isLocked,
    unlock,
    setEnabled,
    setPin,
    recoveryQuestion,
    checkRecoveryAnswer,
    setRecovery,
  } = useAppLock();
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");

  if (!isAuthenticated || !enabled || !pin || !isLocked) return null;

  const handleUnlock = (value: string) => {
    if (value === pin) {
      setError(undefined);
      unlock();
      return;
    }
    setError("Incorrect PIN. Try again.");
  };

  const handleRecovery = async () => {
    if (checkRecoveryAnswer(recoveryAnswer)) {
      await setEnabled(false);
      await setPin(null);
      await setRecovery(null, null);
      setRecoveryAnswer("");
      setShowRecovery(false);
      unlock();
      return;
    }
    setRecoveryAnswer("");
  };

  return (
    <>
      <PinModal
        visible={true}
        onClose={() => {}}
        onSuccess={handleUnlock}
        title="Unlock App"
        subtitle="Enter your PIN to continue."
        error={error}
        onForgot={() => setShowRecovery(true)}
        fullScreen={true}
        showThemeToggle={true}
        showClose={false}
      />
      <Modal visible={showRecovery} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-input w-full max-w-sm rounded-[28px] p-6">
            <Text className="text-lg font-clash text-app font-bold mb-2">
              Reset PIN
            </Text>
            <Text className="text-secondary font-outfit text-sm mb-4">
              {recoveryQuestion || "Answer your recovery question to reset PIN."}
            </Text>
            <TextInput
              className="bg-app border border-app rounded-2xl h-12 px-4 text-app font-outfit mb-4"
              placeholder="Answer"
              placeholderTextColor="#7C7C7C"
              value={recoveryAnswer}
              onChangeText={setRecoveryAnswer}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowRecovery(false);
                  setRecoveryAnswer("");
                }}
                className="flex-1 h-12 items-center justify-center rounded-xl bg-secondary border border-app"
              >
                <Text className="text-app font-outfit font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRecovery}
                className="flex-1 h-12 items-center justify-center rounded-xl bg-accent"
              >
                <Text className="text-white font-outfit font-semibold">
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
