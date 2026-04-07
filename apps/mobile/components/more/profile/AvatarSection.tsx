import React from "react";
import { ActivityIndicator, Image, Modal, Pressable, TouchableOpacity, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { InputField } from "./InputField";

interface AvatarSectionProps {
  avatar: string | null;
  name: string;
  setName: (name: string) => void;
  email: string;
  isUploadingAvatar: boolean;
  onPickAvatar: () => void;
  pendingAvatarUri: string | null;
  onCancelPending: () => void;
  onConfirmPending: () => void;
}

export function AvatarSection({
  avatar,
  name,
  setName,
  email,
  isUploadingAvatar,
  onPickAvatar,
  pendingAvatarUri,
  onCancelPending,
  onConfirmPending,
}: AvatarSectionProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="bg-input rounded-3xl p-6 shadow-sm border border-app"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <View className="flex-row items-center gap-4 mb-6">
        <View className="relative">
          {avatar ? (
            <View className="w-20 h-20 rounded-full overflow-hidden border-2 border-accent">
              <Image source={{ uri: avatar }} style={{ width: 80, height: 80 }} />
            </View>
          ) : (
            <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center border-2 border-accent">
              <Feather name="user" size={40} color={colors.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            onPress={onPickAvatar}
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

      <Modal
        visible={Boolean(pendingAvatarUri)}
        transparent
        animationType="fade"
        onRequestClose={onCancelPending}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6"
          onPress={onCancelPending}
        >
          <Pressable className="w-full rounded-3xl bg-app p-6 border border-app" onPress={(e) => e.stopPropagation()}>
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
                onPress={onCancelPending}
                className="flex-1 rounded-2xl border border-app py-3 items-center"
              >
                <Text className="text-sm font-outfit text-secondary">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirmPending}
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
    </View>
  );
}
