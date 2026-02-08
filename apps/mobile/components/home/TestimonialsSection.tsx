import { Feather } from "@/components/ui/theme-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

const TESTIMONIALS = [
  {
    id: "1",
    name: "Marcus J.",
    role: "Athlete",
    quote:
      "The PHP program completely changed my game. My explosive power increased in just 4 weeks!",
    rating: 5,
  },
  {
    id: "2",
    name: "Sarah L.",
    role: "Parent",
    quote:
      "Coach Oliver is incredible with the kids. Professional, trustworthy, and the results speak for themselves.",
    rating: 5,
  },
  {
    id: "3",
    name: "David K.",
    role: "Athlete",
    quote:
      "Best technical training I've ever had. Level 8 rank feels amazing to achieve!",
    rating: 4,
  },
];

const AUTO_SCROLL_INTERVAL = 5000;

export function TestimonialsSection() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = activeIndex + 1;
      if (nextIndex >= TESTIMONIALS.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: (typeof TESTIMONIALS)[0];
    index: number;
  }) => {
    return (
      <View style={{ width: width }} className="items-center px-6">
        <View
          className="w-full bg-input p-8 rounded-[40px] border border-app/10 shadow-xl"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 20,
            elevation: isDark ? 0 : 5,
          }}
        >
          <View className="flex-row gap-1.5 mb-6">
            {[...Array(5)].map((_, i) => (
              <Feather
                key={i}
                name="star"
                size={16}
                color={i < item.rating ? colors.warning : colors.border}
                fill={i < item.rating ? colors.warning : "transparent"}
              />
            ))}
          </View>

          <Text className="text-app font-outfit text-lg italic leading-relaxed mb-8 opacity-90">
            "{item.quote}"
          </Text>

          <View className="flex-row justify-between items-center border-t border-app/5 pt-6">
            <View>
              <Text className="font-bold font-clash text-app text-lg tracking-tight">
                {item.name}
              </Text>
              <Text className="text-secondary font-outfit text-xs font-medium uppercase tracking-[2px] mt-0.5">
                {item.role}
              </Text>
            </View>
            <View className="w-12 h-12 rounded-full bg-secondary/10 items-center justify-center">
              <Feather
                name="message-square"
                size={20}
                className="text-secondary opacity-60"
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="py-2">
      <View className="flex-row justify-between items-end mb-6 px-6">
        <View>
          <Text className="text-2xl font-bold font-clash text-app tracking-tight">
            Success Stories
          </Text>
          <Text className="text-secondary font-outfit text-sm mt-1">
            Real results from our athletes
          </Text>
        </View>

        <View className="flex-row gap-2 mb-1">
          {TESTIMONIALS.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              return {
                width: withSpring(activeIndex === i ? 24 : 8),
                opacity: withSpring(activeIndex === i ? 1 : 0.3),
                backgroundColor:
                  activeIndex === i ? colors.accent : colors.textSecondary,
              };
            });
            return (
              <Animated.View
                key={i}
                className="h-2 rounded-full"
                style={dotStyle}
              />
            );
          })}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={TESTIMONIALS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
        decelerationRate="fast"
      />
    </View>
  );
}
