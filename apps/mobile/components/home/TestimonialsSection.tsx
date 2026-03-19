import { Feather } from "@/components/ui/theme-icons";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { VideoPlayer } from "@/components/media/VideoPlayer";

const AUTO_SCROLL_INTERVAL = 5000;

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
  mediaType?: "text" | "image" | "video" | string | null;
  videoUrl?: string | null;
  aspectRatio?: "reel" | "landscape" | "square" | string | null;
};

type TestimonialsSectionProps = {
  items?: TestimonialItem[] | null;
};

function videoHeightForAspect(cardInnerWidth: number, aspect?: string | null) {
  const a = aspect === "landscape" ? "landscape" : aspect === "square" ? "square" : "reel";
  const ar = a === "reel" ? 9 / 16 : a === "square" ? 1 : 16 / 9;
  const h = cardInnerWidth / ar;
  return Math.min(Math.max(Math.round(h), 140), a === "reel" ? 520 : 300);
}

function TestimonialBody({ item, innerWidth }: { item: TestimonialItem; innerWidth: number }) {
  const videoUrl = String(item.videoUrl ?? "").trim();
  const showVideo =
    item.mediaType === "video" ||
    (videoUrl.length > 0 && item.mediaType !== "image" && item.mediaType !== "text");
  const photo =
    item.photoUrl ?? item.photo ?? item.imageUrl ?? item.image ?? null;
  const quote = String(item.quote ?? "").trim();

  if (showVideo && videoUrl) {
    const h = videoHeightForAspect(innerWidth, item.aspectRatio ?? undefined);
    return (
      <View className="gap-4">
        <View className="overflow-hidden rounded-2xl bg-black/10">
          <VideoPlayer
            uri={videoUrl}
            height={h}
            autoPlay={false}
            shouldPlay={false}
            initialMuted
            ignoreTabFocus
            isLooping={false}
          />
        </View>
        {quote ? (
          <Text className="text-app font-outfit text-lg italic leading-relaxed opacity-90">
            {"\u201C"}
            {quote}
            {"\u201D"}
          </Text>
        ) : null}
      </View>
    );
  }

  if (photo) {
    return (
      <View className="gap-4">
        {quote ? (
          <Text className="text-app font-outfit text-lg italic leading-relaxed mb-2 opacity-90">
            {"\u201C"}
            {quote}
            {"\u201D"}
          </Text>
        ) : null}
        <View className="w-full overflow-hidden rounded-2xl" style={{ maxHeight: 280 }}>
          <Image source={{ uri: photo }} resizeMode="cover" style={{ width: "100%", height: 220 }} />
        </View>
      </View>
    );
  }

  return (
    <Text className="text-app font-outfit text-lg italic leading-relaxed mb-8 opacity-90">
      {"\u201C"}
      {quote || " "}
      {"\u201D"}
    </Text>
  );
}

export function TestimonialsSection({ items }: TestimonialsSectionProps) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const testimonials = items && items.length ? items : [];
  const isEmpty = testimonials.length === 0;
  const isSingle = testimonials.length === 1;

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      let nextIndex = activeIndex + 1;
      if (nextIndex >= testimonials.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeIndex, testimonials.length]);

  if (isEmpty) {
    return null;
  }

  if (isSingle) {
    const item = testimonials[0];
    const innerW = width - 48 - 64;
    const photo =
      item.photoUrl ??
      item.photo ??
      item.imageUrl ??
      item.image ??
      null;
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
        </View>

        <View className="items-center px-6">
          <View
            className="w-full bg-card p-8 rounded-[40px] shadow-xl"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0 : 0.06,
              shadowRadius: 20,
              elevation: isDark ? 0 : 5,
            }}
          >
            {item.rating ? (
              <View className="mb-4">
                <StarRating rating={item.rating} />
              </View>
            ) : null}
            <View className="mb-6">
              <TestimonialBody item={item} innerWidth={innerW} />
            </View>

            <View className="flex-row justify-between items-center border-t border-separator pt-6">
              <View>
                <Text className="font-bold font-clash text-app text-lg tracking-tight">
                  {item.name}
                </Text>
                <Text className="text-secondary font-outfit text-xs font-medium uppercase tracking-[2px] mt-0.5">
                  {item.role || "Athlete"}
                </Text>
              </View>
              {photo ? (
                <View className="w-24 h-24 rounded-full overflow-hidden bg-secondary/10">
                  <Image
                    source={{ uri: photo }}
                    resizeMode="cover"
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>
              ) : (
                <View className="w-24 h-24 rounded-full bg-secondary/10 items-center justify-center">
                  <Feather
                    name="message-square"
                    size={20}
                    className="text-secondary opacity-60"
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

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
    item: TestimonialItem;
    index: number;
  }) => {
    const innerW = width - 48 - 64;
    const photo =
      item.photoUrl ??
      (item as any).photo ??
      (item as any).imageUrl ??
      (item as any).image ??
      null;
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
          {item.rating ? (
            <View className="mb-4">
              <StarRating rating={item.rating} />
            </View>
          ) : null}
          <View className="mb-6">
            <TestimonialBody item={item} innerWidth={innerW} />
          </View>

          <View className="flex-row justify-between items-center border-t border-separator pt-6">
            <View>
              <Text className="font-bold font-clash text-app text-lg tracking-tight">
                {item.name}
              </Text>
              <Text className="text-secondary font-outfit text-xs font-medium uppercase tracking-[2px] mt-0.5">
                {item.role || "Athlete"}
              </Text>
            </View>
            {photo ? (
              <View className="w-24 h-24 rounded-full overflow-hidden bg-secondary/10">
                <Image
                  source={{ uri: photo }}
                  resizeMode="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            ) : (
              <View className="w-24 h-24 rounded-full bg-secondary/10 items-center justify-center">
                <Feather
                  name="message-square"
                  size={20}
                  className="text-secondary opacity-60"
                />
              </View>
            )}
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
          {testimonials.map((_, i) => (
            <DotIndicator
              key={i}
              isActive={activeIndex === i}
              activeColor={colors.accent}
              inactiveColor={colors.textSecondary}
            />
          ))}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={testimonials}
        renderItem={renderItem}
        keyExtractor={(item, index) => (item.id ? String(item.id) : `t-${index}`)}
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

function DotIndicator({
  isActive,
  activeColor,
  inactiveColor,
}: {
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(isActive ? 24 : 8),
      opacity: withSpring(isActive ? 1 : 0.3),
      backgroundColor: isActive ? activeColor : inactiveColor,
    };
  }, [isActive, activeColor, inactiveColor]);

  return <Animated.View className="h-2 rounded-full" style={dotStyle} />;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const { colors } = useAppTheme();
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={size}
          color={i <= rating ? "#F59E0B" : colors.textSecondary}
          style={i <= rating ? { opacity: 1 } : { opacity: 0.25 }}
        />
      ))}
    </View>
  );
}
