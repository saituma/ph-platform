import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, BookOpen } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { setParentContentCache } from "@/lib/parentContentCache";
import { canAccessTier } from "@/lib/planAccess";
import { formatPlanList, getUnlockingPlanNames } from "@/lib/unlockPlans";
import {
  PARENT_CATEGORIES,
  ParentCourseItem,
} from "@/lib/parentPlatformConstants";

function AutoImage({ uri }: { uri: string }) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  return (
    <ExpoImage
      source={{ uri }}
      style={{ width: "100%", aspectRatio }}
      contentFit="cover"
      onLoad={(e) => {
        const { width, height } = e.source;
        if (width > 0 && height > 0) setAspectRatio(width / height);
      }}
    />
  );
}

export default function ParentCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = PARENT_CATEGORIES.find((c) => c.id === id);
  const { token, programTier } = useAppSelector((s) => s.user);
  const p = useAdminPastel();
  const router = useRouter();

  const [items, setItems] = useState<ParentCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !category) {
      setIsLoading(false);
      return;
    }
    apiRequest<{ items: ParentCourseItem[] }>("/content/parent-courses", {
      token,
    })
      .then((data) => {
        const filtered = (data.items ?? []).filter(
          (i) => i.category === category.title,
        );
        setItems(filtered);
      })
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [token, category?.id]);

  const openCourse = (item: ParentCourseItem) => {
    const canAccess = canAccessTier(programTier, item.programTier ?? null);
    const isLocked = !canAccess && !item.isPreview;
    if (isLocked) {
      const plans = getUnlockingPlanNames(item.programTier ?? "PHP_Premium_Plus");
      const list = formatPlanList(plans);
      Alert.alert(
        "Content locked",
        list ? `Unlocks with: ${list}.` : "Not available for your account.",
        [{ text: "OK" }],
      );
      return;
    }
    setParentContentCache({
      id: Number(item.id),
      title: item.title,
      summary: item.summary,
      description: item.description ?? null,
      coverImage: item.coverImage ?? null,
      category: item.category ?? null,
      programTier: item.programTier ?? null,
      modules: item.modules ?? [],
      isPreview: item.isPreview ?? false,
    });
    router.push(`/parent-platform/${item.id}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: category?.title ?? "Category",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: p.pageBg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      >
        {isLoading ? (
          <View style={{ gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={280} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(380)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 60,
              gap: 16,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={24} color={p.accent} />
            </View>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 15,
                color: p.textSecondary,
                textAlign: "center",
              }}
            >
              No courses in this category yet.
            </Text>
          </Animated.View>
        ) : (
          <View style={{ gap: 20 }}>
            {items.map((item, i) => {
              const canAccess = canAccessTier(
                programTier,
                item.programTier ?? null,
              );
              const isLocked = !canAccess && !item.isPreview;
              return (
                <CourseCard
                  key={item.id}
                  item={item}
                  isLocked={isLocked}
                  onPress={() => openCourse(item)}
                  p={p}
                  index={i}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function CourseCard({
  item,
  isLocked,
  onPress,
  p,
  index,
}: {
  item: ParentCourseItem;
  isLocked: boolean;
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(380)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 22,
          overflow: "hidden",
          opacity: isLocked ? 0.65 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          backgroundColor: p.cardWhite,
        })}
      >
        {item.coverImage ? (
          <AutoImage uri={item.coverImage} />
        ) : (
          <View
            style={{
              width: "100%",
              aspectRatio: 16 / 9,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={32} color={p.accent} strokeWidth={1.5} />
          </View>
        )}

        <View style={{ padding: 20 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 22,
              color: p.textPrimary,
              lineHeight: 28,
              marginBottom: 8,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 14,
              color: p.textSecondary,
              lineHeight: 21,
              marginBottom: 16,
            }}
            numberOfLines={3}
          >
            {item.summary}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 12,
                color: p.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {item.modules?.length ?? 0} modules
              {item.isPreview ? " · Preview" : ""}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isLocked ? (
                <View
                  style={{
                    backgroundColor: p.accentSoft,
                    borderRadius: 100,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 10,
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                      color: p.textSecondary,
                    }}
                  >
                    Locked
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: p.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowRight size={15} color={p.accent} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
