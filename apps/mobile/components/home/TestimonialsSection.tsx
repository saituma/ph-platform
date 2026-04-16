import { Feather } from "@/components/ui/theme-icons";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, View, useWindowDimensions } from "react-native";
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

function TestimonialCard({ item, colors, isDark, cardWidth }: { item: TestimonialItem; colors: any; isDark: boolean; cardWidth: number }) {
  const photo = item.photoUrl ?? item.photo ?? item.imageUrl ?? item.image ?? null;
  const quote = String(item.quote ?? "").trim();

  return (
    <View style={{ width: cardWidth, paddingHorizontal: 8 }}>
      <View
        className="rounded-[32px] p-7"
        style={{
          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
          ...(isDark ? Shadows.none : Shadows.sm),
          minHeight: 280,
        }}
      >
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-row gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name="star"
                size={14}
                color={i <= (item.rating ?? 5) ? "#F59E0B" : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.05)"}
              />
            ))}
          </View>
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.accent} style={{ opacity: 0.2 }} />
        </View>

        <Text 
          className="text-app font-outfit text-[17px] leading-[26px] mb-8 flex-1"
          style={{ color: isDark ? "#F8FAFC" : "#334155" }}
        >
          "{quote}"
        </Text>

        <View className="flex-row items-center gap-4 mt-auto pt-5 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)" }}>
          <View className="h-12 w-12 rounded-full overflow-hidden bg-accent/10">
            {photo ? (
              <Image source={{ uri: photo }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Feather name="user" size={20} color={colors.accent} />
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text className="font-clash font-bold text-app text-[16px]">{item.name}</Text>
            <Text className="text-secondary font-outfit text-[12px] mt-0.5">{item.role || "Verified Athlete"}</Text>
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
  const testimonials = items && items.length ? items : [];

  // Card takes up 85% of screen, plus padding. This ensures the next card peeks in.
  const cardWidth = screenWidth * 0.85;
  const contentInset = (screenWidth - cardWidth) / 2;

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      let nextIndex = activeIndex + 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      // scrollToIndex requires getItemLayout/onScrollToIndexFailed; fixed-width items use offset instead.
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * cardWidth,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeIndex, cardWidth, testimonials.length]);

  if (!testimonials.length) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (index !== activeIndex) setActiveIndex(index);
  };

  return (
    <View>
      <View className="flex-row items-end justify-between px-6 mb-6">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
            <Text className="text-[11px] font-outfit font-bold text-secondary uppercase tracking-[2px]">Real Results</Text>
          </View>
          <Text className="text-[26px] font-clash font-bold text-app leading-tight">Athletes Speak</Text>
        </View>

        <View className="flex-row gap-1.5 mb-1.5">
          {testimonials.map((_, i) => (
            <DotIndicator
              key={i}
              isActive={activeIndex === i}
              activeColor={colors.accent}
              inactiveColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)"}
            />
          ))}
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
