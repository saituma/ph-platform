import React from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { 
  Avatar,
} from "@/components/ui/hero";
import { 
  GroupedInput, 
  GroupedInputItem 
} from "@/components/ui/input";
import { Camera, User, Mail, ShieldCheck } from "lucide-react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

interface AdminAvatarSectionProps {
  avatar: string | null;
  name: string;
  setName: (name: string) => void;
  email: string;
  isUploadingAvatar: boolean;
  onPickAvatar: () => void;
}

export function AdminAvatarSection({
  avatar,
  name,
  setName,
  email,
  isUploadingAvatar,
  onPickAvatar,
}: AdminAvatarSectionProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-10">
      {/* Avatar Selection Section */}
      <View className="items-center justify-center">
        <View className="relative">
          <View className="p-1.5 rounded-[44px] border border-accent/10 bg-accent/5">
            <Avatar size="lg" className="h-32 w-32 rounded-[38px] border-2 border-white/10 shadow-2xl">
              {avatar ? (
                <Avatar.Image source={{ uri: avatar }} className="rounded-[34px]" />
              ) : (
                <Avatar.Fallback className="bg-accent/10">
                  <User size={48} color={colors.accent} strokeWidth={1.5} />
                </Avatar.Fallback>
              )}
            </Avatar>
          </View>
          
          <TouchableOpacity
            onPress={onPickAvatar}
            disabled={isUploadingAvatar}
            activeOpacity={0.8}
            className="absolute -bottom-1 -right-1 w-11 h-11 bg-accent rounded-[14px] items-center justify-center border-[4px] border-card-elevated shadow-lg"
          >
            {isUploadingAvatar ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Camera size={18} color="white" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-5 items-center">
          <View className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/8 border border-accent/15">
            <ShieldCheck size={12} color={colors.accent} strokeWidth={2.5} />
            <Text className="text-[10px] font-outfit-black text-accent uppercase tracking-[0.15em]">Administrative Identity</Text>
          </View>
        </View>
      </View>

      {/* Identity Form Section */}
      <View className="gap-1">
        <GroupedInput>
          <GroupedInputItem
            label="Full Name"
            value={name}
            onChangeText={setName}
            icon={User}
            placeholder="Enter your system name"
            placeholderTextColor={colors.textSecondary + '40'}
            inputStyle={{ fontFamily: "Outfit-Bold" }}
          />
          <GroupedInputItem
            label="Email"
            value={email}
            editable={false}
            icon={Mail}
            disabled
            inputStyle={{ opacity: 0.5 }}
          />
        </GroupedInput>

        <View className="px-3 mt-2">
          <Text className="text-[11px] font-outfit text-secondary opacity-50 leading-5">
            Identity details are synced with central command. Email changes require security clearance protocols.
          </Text>
        </View>
      </View>
    </View>
  );
}
