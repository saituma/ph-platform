import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Heart,
  Brain,
  Shield,
  Sparkles,
} from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { AgeGate } from "@/components/AgeGate";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { setParentContentCache } from "@/lib/parentContentCache";
import {
  PARENT_CATEGORIES,
  ParentCourseItem,
} from "@/lib/parentPlatformConstants";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

const CATEGORY_COLORS = ["cardMint", "cardPeach", "cardLavender", "cardPink", "cardYellow", "cardSage"] as const;
const CATEGORY_ICONS = [GraduationCap, Heart, Brain, Shield, Sparkles, BookOpen];

export default function ParentPlatformScreen() {
  const { token } = useAppSelector((s) => s.user);
  const router = useRouter();
  const { isSectionHidden } = useAgeExperience();
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  const [items, setItems] = useState<ParentCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ items: ParentCourseItem[] }>(
        "/content/parent-courses",
        { token },
      );
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const featured = useMemo(() => items.slice(0, 3), [items]);

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

  if (isSectionHidden("parentPlatform")) {
    return (
      <AgeGate
        title="Parent platform locked"
        message="Parent education content is restricted for this age."
      />
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: p.pageBg }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{ paddingHorizontal: 24, paddingTop: insets.top + 20, paddingBottom: 28 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: p.cardMint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GraduationCap size={18} color={p.accent} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: p.accent,
            }}
          >
            Family Support Library
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 34,
            color: p.textPrimary,
            letterSpacing: -0.5,
            lineHeight: 40,
          }}
        >
          Parent Education
        </Text>
        <Animated.View entering={FadeIn.delay(300).duration(500)}>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 15,
              color: p.textSecondary,
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Expert guidance to help you support your young athlete at home.
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Featured highlights */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(380)}
        style={{ paddingHorizontal: 24 }}
      >
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: p.textMuted,
            marginBottom: 14,
            marginLeft: 2,
          }}
        >
          Featured
        </Text>
        {isLoading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={240} />
            ))}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {featured.map((item, idx) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(140 + idx * 80).duration(380)}
              >
                <FeaturedCard
                  item={item}
                  onPress={() => openCourse(item)}
                  p={p}
                  cardBg={p[CATEGORY_COLORS[idx % CATEGORY_COLORS.length]]}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Category grid */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(380)}
        style={{ paddingHorizontal: 24, marginTop: 36 }}
      >
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: p.textMuted,
            marginBottom: 14,
            marginLeft: 2,
          }}
        >
          Browse by topic
        </Text>
        <View style={{ gap: 10 }}>
          {PARENT_CATEGORIES.map((cat, idx) => {
            const IconComp = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
            const cardColor = p[CATEGORY_COLORS[idx % CATEGORY_COLORS.length]];
            return (
              <Animated.View
                key={cat.id}
                entering={FadeInDown.delay(240 + idx * 50).duration(350)}
              >
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/parent-platform/category/[id]", params: { id: cat.id } })
                  }
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      borderRadius: 20,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: p.cardWhite,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: cardColor,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconComp size={20} color={p.accent} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: "Outfit-SemiBold",
                        fontSize: 15,
                        color: p.textPrimary,
                        lineHeight: 20,
                      }}
                      numberOfLines={1}
                    >
                      {cat.title}
                    </Text>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        backgroundColor: p.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={14} color={p.accent} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function AutoImage({
  uri,
  borderRadius = 0,
}: {
  uri: string;
  borderRadius?: number;
}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  return (
    <ExpoImage
      source={{ uri }}
      style={{ width: "100%", aspectRatio, borderRadius }}
      contentFit="cover"
      onLoad={(e) => {
        const { width, height } = e.source;
        if (width > 0 && height > 0) setAspectRatio(width / height);
      }}
    />
  );
}

function FeaturedCard({
  item,
  onPress,
  p,
  cardBg,
}: {
  item: ParentCourseItem;
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
  cardBg: string;
}) {
  return (
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
            backgroundColor: cardBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={36} color={p.accent} strokeWidth={1.5} />
        </View>
      )}

      <View style={{ padding: 18 }}>
        {item.category ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: cardBg,
              borderRadius: 100,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: p.accent,
              }}
            >
              {item.category}
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 20,
            color: p.textPrimary,
            lineHeight: 26,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 14,
            color: p.textSecondary,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {item.summary}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
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
              width: 30,
              height: 30,
              borderRadius: 10,
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
  );
}
