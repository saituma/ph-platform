import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Image, Linking, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ScaledText";

type CoachSectionProps = {
  headline?: string | null;
  description?: string | null;
  heroImageUrl?: string | null;
  introVideoUrl?: string | null;
};

export function CoachSection({
  headline,
  description,
  heroImageUrl,
  introVideoUrl,
}: CoachSectionProps) {
  return (
    <View className="gap-6">
      <View className="bg-input p-6 rounded-[40px] border border-app shadow-sm overflow-hidden">
        <View className="flex-row items-center gap-4 mb-6">
          <View className="w-20 h-20 rounded-3xl bg-secondary border border-app overflow-hidden items-center justify-center">
            {heroImageUrl ? (
              <Image
                source={{ uri: heroImageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Feather name="user" size={40} className="text-muted" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold font-outfit text-accent uppercase tracking-[2px] mb-1">
              Head Coach
            </Text>
            <Text className="text-2xl font-bold font-clash text-app leading-tight">
              {headline || "Meet Coach Mike Green"}
            </Text>
          </View>
        </View>

        <Text className="text-secondary font-outfit text-sm leading-relaxed mb-6">
          {description ||
            "With over 12 years of experience in elite youth football development, Coach Mike Green founded Lift Lab / PHP to bridge the gap between raw talent and professional performance. His philosophy combines rigorous physical conditioning with mental resilience training."}
        </Text>

        {introVideoUrl ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(introVideoUrl).catch(() => null)}
            className="flex-row items-center gap-2"
          >
            <Text className="text-accent font-bold font-outfit text-sm">
              Watch Intro
            </Text>
            <Feather name="arrow-right" size={16} className="text-accent" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="bg-slate-950 rounded-[40px] overflow-hidden shadow-xl aspect-video relative border-4 border-slate-900">
        <View className="absolute inset-0 bg-black/40 items-center justify-center z-10">
          {introVideoUrl ? (
            <>
              <TouchableOpacity
                onPress={() => Linking.openURL(introVideoUrl).catch(() => null)}
                className="w-16 h-16 bg-accent rounded-full items-center justify-center shadow-lg shadow-accent/50"
              >
                <View className="ml-1">
                  <Feather name="play" size={24} color="white" fill="white" />
                </View>
              </TouchableOpacity>
              <Text className="text-white font-bold font-outfit mt-4 tracking-wide uppercase text-[0.625rem]">
                Watch Intro Video
              </Text>
            </>
          ) : (
            <Text className="text-white font-bold font-outfit mt-4 tracking-wide uppercase text-[0.625rem]">
              Intro Video
            </Text>
          )}
        </View>

        <View className="flex-1 bg-secondary opacity-50" />
      </View>
    </View>
  );
}