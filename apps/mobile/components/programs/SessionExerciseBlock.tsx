import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SessionItem } from "@/hooks/programs/useSessionData";
import { Image as ExpoImage } from "expo-image";

interface Props {
  title: string;
  items: SessionItem[];
  onVideoPress: (url: string) => void;
  onUploadPress: (id: number, title: string) => void;
  hasUploaded: Record<number, boolean>;
  canUpload: boolean;
}

export function SessionExerciseBlock({ title, items, onVideoPress, onUploadPress, hasUploaded, canUpload }: Props) {
  const { colors, isDark } = useAppTheme();
  if (items.length === 0) return null;

  return (
    <View className="mb-8">
      <Text className="text-sm font-outfit-bold text-accent uppercase tracking-widest mb-4">{title}</Text>
      <View className="gap-4">
        {items.map((item) => (
          <View key={item.id} className="rounded-3xl border p-4 bg-card" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}>
            <View className="flex-row items-start gap-4">
              {item.videoUrl && (
                <Pressable onPress={() => onVideoPress(item.videoUrl!)} className="h-20 w-20 rounded-2xl overflow-hidden bg-black/5">
                  <ExpoImage source={item.videoUrl} style={{ width: "100%", height: "100%" }} />
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <Feather name="play" size={20} color="white" />
                  </View>
                </Pressable>
              )}
              <View className="flex-1">
                <Text className="text-lg font-clash font-bold text-app">{item.title}</Text>
                {item.metadata && (
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {item.metadata.sets && <Text className="text-xs font-outfit text-secondary">{item.metadata.sets} sets</Text>}
                    {item.metadata.reps && <Text className="text-xs font-outfit text-secondary">{item.metadata.reps} reps</Text>}
                    {item.metadata.duration && <Text className="text-xs font-outfit text-secondary">{item.metadata.duration}s</Text>}
                  </View>
                )}
              </View>
              {canUpload && item.allowVideoUpload && (
                <Pressable onPress={() => onUploadPress(item.id, item.title)} className="h-10 w-10 rounded-full bg-accent/10 items-center justify-center">
                  <Feather name="video" size={18} color={hasUploaded[item.id] ? colors.success : colors.accent} />
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
