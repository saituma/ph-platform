import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
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
import {
  PARENT_CATEGORIES,
  ParentCourseItem,
} from "@/lib/parentPlatformConstants";

const CARD_COLORS = ["cardMint", "cardPeach", "cardLavender", "cardPink", "cardYellow", "cardSage"] as const;

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
  const { token } = useAppSelector((s) => s.user);
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
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={260} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(380)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 60,
              gap: 14,
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
                fontFamily: "Outfit-SemiBold",
                fontSize: 18,
                color: p.textPrimary,
                textAlign: "center",
              }}
            >
              No courses yet
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Regular",
                fontSize: 14,
                color: p.textSecondary,
                textAlign: "center",
                maxWidth: 260,
              }}
            >
              New courses will appear here when they're added to this category.
            </Text>
          </Animated.View>
        ) : (
          <View style={{ gap: 16 }}>
            {items.map((item, i) => (
              <CourseCard
                key={item.id}
                item={item}
                onPress={() => openCourse(item)}
                p={p}
                index={i}
                cardBg={p[CARD_COLORS[i % CARD_COLORS.length]]}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function CourseCard({
  item,
  onPress,
  p,
  index,
  cardBg,
}: {
  item: ParentCourseItem;
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
  index: number;
  cardBg: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(380)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 22,
          overflow: "hidden",
          opacity: pressed ? 0.92 : 1,
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
              aspectRatio: 2.2,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={32} color={p.accent} strokeWidth={1.5} />
          </View>
        )}

        <View style={{ padding: 18 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 20,
              color: p.textPrimary,
              lineHeight: 26,
              marginBottom: 6,
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
              marginBottom: 14,
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.accent }} />
              <Text
                style={{
                  fontFamily: "Outfit-Medium",
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                {item.modules?.length ?? 0} modules
              </Text>
            </View>

            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 11,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowRight size={14} color={p.accent} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
