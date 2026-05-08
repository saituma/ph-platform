import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { AppIcon } from "@/components/ui/app-icon";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";

const AUTO_SCROLL_INTERVAL = 15000;

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
  loading?: boolean;
};

function TestimonialCard({
  item,
  p,
  cardWidth,
}: {
  item: TestimonialItem;
  p: any;
  cardWidth: number;
}) {
  const photo = item.photoUrl ?? item.photo ?? item.imageUrl ?? item.image ?? null;
  const quote = String(item.quote ?? "").trim();
  const rating = Math.max(1, Math.min(5, Number(item.rating ?? 5)));

  return (
    <View style={{ width: cardWidth, paddingHorizontal: 6 }}>
      <View
        style={{
          minHeight: 200,
          borderRadius: 22,
          padding: 20,
          backgroundColor: p.cardWhite,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.cardMint,
            }}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <AppIcon name="user" size={22} color={p.accent} />
            )}
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 16,
                lineHeight: 20,
                color: p.textPrimary,
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.role ? (
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 13,
                  lineHeight: 17,
                  color: p.textMuted,
                }}
                numberOfLines={1}
              >
                {item.role}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 12, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: i <= rating ? p.accent : p.accentSoft,
                }}
              />
            ))}
          </View>

          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 15,
              lineHeight: 23,
              color: p.textSecondary,
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

export const TestimonialsSection = React.memo(function TestimonialsSection({ items, loading }: TestimonialsSectionProps) {
  const { width: screenWidth } = useWindowDimensions();
  const p = useAdminPastel();
  const flatListRef = useRef<FlashListRef<TestimonialItem>>(null);
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

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex((prev) => {
      if (index !== prev) {
        activeIndexRef.current = index;
        return index;
      }
      return prev;
    });
  }, [cardWidth]);

  const renderTestimonialItem = useCallback(({ item }: { item: TestimonialItem }) => (
    <TestimonialCard item={item} p={p} cardWidth={cardWidth} />
  ), [p, cardWidth]);

  if (!testimonials.length && !loading) return null;

  if (loading) {
    const skeletonCardW = screenWidth - 40;
    return (
      <View style={{ gap: 10 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonBox width={140} height={20} borderRadius={4} />
        </View>
        {[0, 1].map((i) => (
          <View key={i} style={{ width: skeletonCardW, paddingHorizontal: 20, gap: 8, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SkeletonBox width={44} height={44} borderRadius={22} />
              <View style={{ gap: 6 }}>
                <SkeletonBox width={120} height={15} borderRadius={4} />
                <SkeletonBox width={80} height={12} borderRadius={4} />
              </View>
            </View>
            <SkeletonBox width="90%" height={13} borderRadius={4} />
            <SkeletonBox width="75%" height={13} borderRadius={4} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 20,
              lineHeight: 24,
              color: p.textPrimary,
            }}
          >
            Testimonials
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 13,
              lineHeight: 18,
              color: p.textMuted,
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
                activeColor={p.accent}
                inactiveColor={p.accentSoft}
              />
            ))}
          </View>
        ) : null}
      </View>

      <FlashList
        ref={flatListRef}
        data={testimonials}
        renderItem={renderTestimonialItem}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `t-${index}`)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sideInset - 6 }}
        snapToInterval={cardWidth}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { isUserInteractingRef.current = true; }}
        onScrollEndDrag={() => { isUserInteractingRef.current = false; }}
      />
    </View>
  );
});

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
