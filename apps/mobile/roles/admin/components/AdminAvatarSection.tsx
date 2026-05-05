import React from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { 
  Avatar, 
  TextField, 
  Input, 
  Label,
  UISurface,
  cn 
} from "@/components/ui/hero";
import { Camera, User, Mail } from "lucide-react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

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
    <View className="gap-8">
      <View className="items-center">
        <View className="relative">
          <Avatar size="lg" className="h-32 w-32 rounded-[40px] border-4 border-accent/20">
            {avatar ? (
              <Avatar.Image source={{ uri: avatar }} className="rounded-[36px]" />
            ) : (
              <Avatar.Fallback className="bg-accent/10">
                <User size={48} color={colors.accent} />
              </Avatar.Fallback>
            )}
          </Avatar>
          
          <TouchableOpacity
            onPress={onPickAvatar}
            disabled={isUploadingAvatar}
            className="absolute -bottom-2 -right-2 w-12 h-12 bg-accent rounded-2xl items-center justify-center border-4 border-background shadow-lg"
          >
            {isUploadingAvatar ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Camera size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="gap-6">
        <TextField>
          <Label className="ml-1 mb-2 text-xs font-black uppercase tracking-widest text-muted">
            Admin Identity
          </Label>
          <UISurface className="flex-row items-center px-4 h-16 rounded-[22px] border-accent/10">
            <User size={20} color={colors.accent} strokeWidth={2} className="mr-3" />
            <Input
              value={name}
              onChangeText={setName}
              placeholder="System Name"
              className="flex-1 text-base font-outfit-bold text-foreground"
            />
          </UISurface>
        </TextField>

        <TextField isDisabled>
          <Label className="ml-1 mb-2 text-xs font-black uppercase tracking-widest text-muted">
            Security Email
          </Label>
          <UISurface className="flex-row items-center px-4 h-16 rounded-[22px] border-transparent bg-muted/5 opacity-60">
            <Mail size={20} color={colors.textSecondary} strokeWidth={2} className="mr-3" />
            <Input
              value={email}
              editable={false}
              className="flex-1 text-base font-outfit text-muted"
            />
          </UISurface>
        </TextField>
      </View>
    </View>
  );
}
