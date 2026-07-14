import React from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { ChevronLeft, FileText, HelpCircle, Play } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fetchParentCourse, type ParentCourseModule } from "@/services/parentPlatformService";

const MODULE_ICON: Record<ParentCourseModule["type"], typeof FileText> = {
  article: FileText,
  video: Play,
  pdf: FileText,
  faq: HelpCircle,
};

export default function ParentCourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const token = useAppSelector((state) => state.user.token);
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();

  const id = Number(courseId);

  const { data, isLoading } = useQuery({
    queryKey: ["parent-platform-course", id],
    queryFn: () => fetchParentCourse(token!, id),
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(token) && Number.isFinite(id),
  });

  const course = data?.item ?? null;
  const modules = [...(course?.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={24} color={p.textPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : !course ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
            Course not found
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
          {course.coverImage ? (
            <ExpoImage
              source={{ uri: course.coverImage }}
              contentFit="cover"
              style={{ width: "100%", height: 180, borderRadius: 16, backgroundColor: p.accentSoft }}
            />
          ) : null}

          <Text style={{ marginTop: 16, fontFamily: "Outfit-Bold", fontSize: 26, color: p.textPrimary }}>
            {course.title}
          </Text>
          {course.summary ? (
            <Text style={{ marginTop: 6, fontFamily: "Outfit-Regular", fontSize: 15, color: p.textSecondary }}>
              {course.summary}
            </Text>
          ) : null}
          {course.category ? (
            <Text style={{ marginTop: 10, fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, letterSpacing: 0.4 }}>
              {course.category.toUpperCase()}
            </Text>
          ) : null}

          {course.description ? (
            <View style={{ marginTop: 20, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.cardWhite, padding: 16 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary, marginBottom: 8 }}>
                Overview
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 21, color: p.textSecondary }}>
                {course.description}
              </Text>
            </View>
          ) : null}

          {modules.length ? (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>
                Modules
              </Text>
              {modules.map((module) => (
                <ModuleCard key={module.id} module={module} p={p} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function ModuleCard({ module, p }: { module: ParentCourseModule; p: any }) {
  const Icon = MODULE_ICON[module.type] ?? FileText;

  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.cardWhite, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: p.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={p.accent} />
        </View>
        <Text style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>
          {module.title}
        </Text>
      </View>
      {module.content ? (
        <Text style={{ marginTop: 10, fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20, color: p.textSecondary }}>
          {module.content}
        </Text>
      ) : null}
      {module.mediaUrl ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            void Linking.openURL(module.mediaUrl!);
          }}
          hitSlop={8}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
            {module.type === "video" ? "Watch video" : "Open resource"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
