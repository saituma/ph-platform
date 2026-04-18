import { Feather } from "@/components/ui/theme-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { Shadows } from "@/constants/theme";

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
    <View style={{ width: cardWidth, paddingHorizontal: 8 }}>
      <View
        className="rounded-[32px] p-6 border"
        style={{
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.sm),
          minHeight: 264,
        }}
      >
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <View
              className="rounded-full px-3 py-1 border"
              style={{
                backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)",
                borderColor: isDark ? "rgba(34,197,94,0.20)" : "rgba(34,197,94,0.16)",
              }}
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text
                  className="text-[11px] font-outfit font-bold"
                  style={{ color: isDark ? "#E2E8F0" : "#0F172A" }}
                >
                  {rating.toFixed(1)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name="star"
                  size={13}
                  color={
                    i <= rating
                      ? "#F59E0B"
                      : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(15,23,42,0.07)"
                  }
                />
              ))}
            </View>
          </View>

          <Ionicons
            name="chatbubble-ellipses"
            size={22}
            color={colors.accent}
            style={{ opacity: isDark ? 0.22 : 0.16 }}
          />
        </View>

        <Text
          className="font-outfit text-[16px] leading-[26px] flex-1"
          style={{ color: isDark ? "#E2E8F0" : "#334155" }}
          numberOfLines={6}
        >
          {quote ? `“${quote}”` : "“Great experience.”"}
        </Text>

        <View
          className="flex-row items-center gap-4 mt-auto pt-5 border-t"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
          }}
        >
          <View
            className="h-12 w-12 rounded-full overflow-hidden items-center justify-center border"
            style={{
              backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)",
              borderColor: isDark ? "rgba(34,197,94,0.20)" : "rgba(34,197,94,0.16)",
            }}
          >
            {photo ? (
              <Image source={{ uri: photo }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Feather name="user" size={18} color={colors.accent} />
            )}
          </View>
          <View className="flex-1">
            <Text
              className="font-clash font-bold text-[16px]"
              style={{ color: isDark ? "#F8FAFC" : colors.text }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.role ? (
              <Text
                className="font-outfit text-[11px] mt-0.5 uppercase tracking-[1.2px]"
                style={{ color: isDark ? "rgba(226,232,240,0.72)" : "rgba(71,85,105,0.82)" }}
                numberOfLines={1}
              >
                {item.role}
              </Text>
            ) : null}
          </View>
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

  // Card takes up 85% of screen, plus padding. This ensures the next card peeks in.
  const cardWidth = screenWidth * 0.85;
  const contentInset = (screenWidth - cardWidth) / 2;

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      if (isUserInteractingRef.current) return;
      const currentIndex = activeIndexRef.current;
      let nextIndex = currentIndex + 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      // scrollToIndex requires getItemLayout/onScrollToIndexFailed; fixed-width items use offset instead.
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
    <View>
      <View className="flex-row items-end justify-between px-6 mb-4">
        <View className="flex-1 pr-4">
          <Text className="text-lg font-clash font-bold text-app">Testimonials</Text>
          <Text
            className="mt-1 text-[12px] font-outfit"
            style={{ color: isDark ? "rgba(226,232,240,0.72)" : "rgba(71,85,105,0.82)" }}
            numberOfLines={1}
          >
            Real feedback from athletes & parents
          </Text>
        </View>

        <View className="items-end">
          <Text
            className="text-[11px] font-outfit font-bold uppercase tracking-[1.2px]"
            style={{ color: isDark ? "rgba(226,232,240,0.78)" : "rgba(71,85,105,0.82)" }}
          >
            {activeIndex + 1} / {testimonials.length}
          </Text>
          <View className="flex-row gap-1.5 mt-2">
            {testimonials.map((_, i) => (
              <DotIndicator
                key={i}
                isActive={activeIndex === i}
                activeColor={colors.accent}
                inactiveColor={isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.10)"}
              />
            ))}
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={testimonials}
        renderItem={({ item }) => (
          <TestimonialCard 
            item={item} 
            colors={colors} 
            isDark={isDark} 
            cardWidth={cardWidth}
          />
        )}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `t-${index}`)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: contentInset - 8 }} // Adjust for card's internal padding
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

function DotIndicator({ isActive, activeColor, inactiveColor }: any) {
  const dotStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 16 : 6, { damping: 15 }),
    height: 6,
    backgroundColor: isActive ? activeColor : inactiveColor,
    borderRadius: 3,
  }), [isActive]);

  return <Animated.View style={dotStyle} />;
}
