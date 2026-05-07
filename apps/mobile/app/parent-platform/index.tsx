import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, BookOpen, ChevronRight, Lock } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { AgeGate } from "@/components/AgeGate";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";
import { setParentContentCache } from "@/lib/parentContentCache";
import { canAccessTier, hasPremiumPlanFeatures } from "@/lib/planAccess";
import { formatPlanList, getUnlockingPlanNames } from "@/lib/unlockPlans";
import {
  PARENT_CATEGORIES,
  ParentCourseItem,
} from "@/lib/parentPlatformConstants";

export default function ParentPlatformScreen() {
  const { token, programTier } = useAppSelector((s) => s.user);
  const router = useRouter();
  const { isSectionHidden } = useAgeExperience();
  const p = useAdminPastel();

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
  const hasPremiumAccess = hasPremiumPlanFeatures(programTier);

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

  if (isSectionHidden("parentPlatform")) {
    return (
      <AgeGate
        title="Parent platform locked"
        message="Parent education content is restricted for this age."
      />
    );
  }

  if (!hasPremiumAccess) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: p.pageBg }}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      >
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Lock size={24} color={p.accent} />
          </View>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 28,
              color: p.textPrimary,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Parent Education
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 15,
              color: p.textSecondary,
              textAlign: "center",
              lineHeight: 22,
              maxWidth: 280,
              marginBottom: 32,
            }}
          >
            This section isn't available for your account yet. Check the Programs tab for more.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            style={({ pressed }) => ({
              backgroundColor: p.accent,
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 100,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.buttonPrimaryText }}>
              Open Programs
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: p.pageBg }}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Hero */}
      <Animated.View
        entering={FadeInDown.duration(380)}
        style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: p.accentSoft,
            borderRadius: 100,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 10,
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
            fontSize: 40,
            color: p.textPrimary,
            letterSpacing: -0.5,
            lineHeight: 46,
          }}
        >
          Parent Education
        </Text>
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

      {/* Featured highlights */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(380)}
        style={{ paddingHorizontal: 24 }}
      >
        <SectionLabel label="Featured" p={p} />
        {isLoading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={240} />
            ))}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {featured.map((item) => {
              const isLocked =
                !canAccessTier(programTier, item.programTier ?? null) &&
                !item.isPreview;
              return (
                <FeaturedCard
                  key={item.id}
                  item={item}
                  isLocked={isLocked}
                  onPress={() => openCourse(item)}
                  p={p}
                />
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Category grid */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(380)}
        style={{ paddingHorizontal: 24, marginTop: 40 }}
      >
        <SectionLabel label="Browse by topic" p={p} />
        <View style={{ gap: 12 }}>
          {PARENT_CATEGORIES.map((cat) => {
            return (
              <Pressable
                key={cat.id}
                onPress={() =>
                  router.push({ pathname: "/parent-platform/category/[id]", params: { id: cat.id } })
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    borderRadius: 22,
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
                      backgroundColor: p.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={20} color={p.accent} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: "Outfit-Bold",
                      fontSize: 14,
                      color: p.textPrimary,
                      lineHeight: 20,
                    }}
                    numberOfLines={1}
                  >
                    {cat.title}
                  </Text>
                  <ChevronRight size={16} color={p.textSecondary} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function SectionLabel({ label, p }: { label: string; p: ReturnType<typeof useAdminPastel> }) {
  return (
    <Text
      style={{
        fontFamily: "Outfit-Bold",
        fontSize: 10,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: p.textMuted,
        marginBottom: 16,
        marginLeft: 2,
      }}
    >
      {label}
    </Text>
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
  isLocked,
  onPress,
  p,
}: {
  item: ParentCourseItem;
  isLocked: boolean;
  onPress: () => void;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
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

      <View style={{ padding: 18 }}>
        {item.category ? (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: p.accentSoft,
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
            fontSize: 22,
            color: p.textPrimary,
            lineHeight: 28,
            marginBottom: 8,
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
            marginTop: 16,
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
            <ArrowRight size={16} color={p.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
