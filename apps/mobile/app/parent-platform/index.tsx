import React from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { ChevronLeft } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { fetchParentCourses, type ParentCourse } from "@/services/parentPlatformService";

export default function ParentPlatformScreen() {
  const token = useAppSelector((state) => state.user.token);
  const router = useRouter();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["parent-platform-courses"],
    queryFn: () => fetchParentCourses(token!),
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(token),
  });

  const courses = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={24} color={p.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: p.textPrimary }}>
            Parent Platform
          </Text>
          <Text style={{ marginTop: 2, fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary }}>
            Courses and guides for your parent or guardian.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: "center" }}>
              <Text style={{ fontFamily: "Outfit-Bold", color: p.textPrimary, fontSize: 18 }}>
                Nothing here yet
              </Text>
              <Text style={{ marginTop: 6, color: p.textSecondary, fontFamily: "Outfit-Regular", textAlign: "center" }}>
                Parent courses will appear here once published.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              p={p}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push(`/parent-platform/${item.id}` as any);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function CourseCard({ course, p, onPress }: { course: ParentCourse; p: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 16, backgroundColor: p.cardWhite, borderWidth: 1, borderColor: p.border, overflow: "hidden" }}
    >
      {course.coverImage ? (
        <ExpoImage
          source={{ uri: course.coverImage }}
          contentFit="cover"
          style={{ width: "100%", height: 140, backgroundColor: p.accentSoft }}
        />
      ) : null}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 17, color: p.textPrimary }}>
            {course.title}
          </Text>
          {course.isPreview ? (
            <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent }}>PREVIEW</Text>
            </View>
          ) : null}
        </View>
        {course.summary ? (
          <Text numberOfLines={2} style={{ marginTop: 6, fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary }}>
            {course.summary}
          </Text>
        ) : null}
        {course.category ? (
          <Text style={{ marginTop: 10, fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, letterSpacing: 0.4 }}>
            {course.category.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
