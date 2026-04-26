import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { AppIcon } from "@/components/ui/app-icon";
import { radius, spacing } from "@/constants/theme";

const AUTO_SCROLL_INTERVAL = 6000;

type TestimonialItem = {
  id: string;
  name: string;
  role?: string | null;
  quote: string;
  rating?: number | null;
  photoUrl?: string | null;
  photo?: string | null;
  imageUrl?: string | null;
  image?: string | null;
};

type TestimonialsSectionProps = {
  items?: TestimonialItem[] | null;
};

function TestimonialCard({
  item,
  colors,
  isDark,
  cardWidth,
}: {
  item: TestimonialItem;
  colors: any;
  isDark: boolean;
  cardWidth: number;
}) {
  const photo = item.photoUrl ?? item.photo ?? item.imageUrl ?? item.image ?? null;
  const quote = String(item.quote ?? "").trim();
  const rating = Math.max(1, Math.min(5, Number(item.rating ?? 5)));

  return (
    <View style={{ width: cardWidth, paddingHorizontal: 6 }}>
      <View
        style={{
          minHeight: 206,
          borderRadius: radius.xl,
          padding: spacing.xl,
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(16,25,20,0.07)",
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? colors.heroSurfaceMuted : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(16,25,20,0.06)",
            }}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <AppIcon name="user" size={22} color={colors.accent} />
            )}
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontFamily: "Satoshi-Bold",
                fontSize: 16,
                lineHeight: 20,
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.role ? (
              <Text
                style={{
                  fontFamily: "Satoshi-Medium",
                  fontSize: 13,
                  lineHeight: 17,
                  color: colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {item.role}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ gap: spacing.md, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor:
                    i <= rating
                      ? colors.accent
                      : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(16,25,20,0.10)",
                }}
              />
            ))}
          </View>

          <Text
            style={{
              fontFamily: "Satoshi-Medium",
              fontSize: 16,
              lineHeight: 24,
              color: colors.text,
            }}
            numberOfLines={5}
          >
            {quote ? `"${quote}"` : '"Great experience."'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function TestimonialsSection({ items }: TestimonialsSectionProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isUserInteractingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const testimonials = items && items.length ? items : [];

  const cardWidth = Math.min(screenWidth - 40, 340);
  const sideInset = Math.max(20, (screenWidth - cardWidth) / 2);

  useEffect(() => {
    if (testimonials.length <= 1) return;

    const interval = setInterval(() => {
      if (isUserInteractingRef.current) return;
      const currentIndex = activeIndexRef.current;
      let nextIndex = currentIndex + 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;

      flatListRef.current?.scrollToOffset({
        offset: nextIndex * cardWidth,
        animated: true,
      });

      setActiveIndex(nextIndex);
      activeIndexRef.current = nextIndex;
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [cardWidth, testimonials.length]);

  if (!testimonials.length) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
      activeIndexRef.current = index;
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          paddingHorizontal: spacing.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontFamily: "Satoshi-Bold",
              fontSize: 20,
              lineHeight: 24,
              color: colors.text,
            }}
          >
            Testimonials
          </Text>
          <Text
            style={{
              fontFamily: "Satoshi-Medium",
              fontSize: 13,
              lineHeight: 18,
              color: colors.textSecondary,
            }}
          >
            What athletes are saying
          </Text>
        </View>

        {testimonials.length > 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {testimonials.map((_, i) => (
              <DotIndicator
                key={i}
                isActive={activeIndex === i}
                activeColor={colors.accent}
                inactiveColor={isDark ? "rgba(255,255,255,0.16)" : "rgba(16,25,20,0.12)"}
              />
            ))}
          </View>
        ) : null}
      </View>

      <FlatList
        ref={flatListRef}
        data={testimonials}
        renderItem={({ item }) => (
          <TestimonialCard item={item} colors={colors} isDark={isDark} cardWidth={cardWidth} />
        )}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `t-${index}`)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sideInset - 6 }}
        snapToInterval={cardWidth}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isUserInteractingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isUserInteractingRef.current = false;
        }}
      />
    </View>
  );
}

function DotIndicator({
  isActive,
  activeColor,
  inactiveColor,
}: {
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const dotStyle = useAnimatedStyle(
    () => ({
      width: withSpring(isActive ? 16 : 6, { damping: 15 }),
      height: 6,
      backgroundColor: isActive ? activeColor : inactiveColor,
      borderRadius: 999,
    }),
    [isActive, activeColor, inactiveColor],
  );

  return <Animated.View style={dotStyle} />;
}
