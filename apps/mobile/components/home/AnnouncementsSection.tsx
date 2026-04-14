import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useIsFocused, NavigationContext } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";

const AUTO_SCROLL_INTERVAL = 6000;

export type AnnouncementItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AnnouncementsSectionProps = {
  items?: AnnouncementItem[] | null;
};

type ParsedAnnouncement = {
  text: string;
  images: string[];
  videos: string[];
};

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  return encodeURI(trimmed);
};

const extractAnnouncements = (item: AnnouncementItem): ParsedAnnouncement => {
  const raw = (item.body ?? item.content ?? "").toString();
  const images: string[] = [];
  const videos: string[] = [];

  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const videoRegex = /\[Video\]\(([^)]+)\)/gi;

  let text = raw;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw)) !== null) {
    if (match[1]) images.push(normalizeMediaUrl(match[1]));
  }
  while ((match = videoRegex.exec(raw)) !== null) {
    if (match[1]) videos.push(normalizeMediaUrl(match[1]));
  }

  if (images.length === 0 || videos.length === 0) {
    const urlRegex = /(https?:\/\/[^\s)]+|\bwww\.[^\s)]+)/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlRegex.exec(raw)) !== null) {
      const url = normalizeMediaUrl(urlMatch[1]);
      if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)) {
        if (!images.includes(url)) images.push(url);
      } else if (/\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url)) {
        if (!videos.includes(url)) videos.push(url);
      }
    }
  }

  text = text.replace(imageRegex, "");
  text = text.replace(videoRegex, "");
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text, images, videos };
};

export function AnnouncementsSection(props: AnnouncementsSectionProps) {
  const navContext = React.useContext(NavigationContext);
  if (!navContext) {
    return <AnnouncementsSectionBase {...props} isFocused={true} />;
  }
  return <AnnouncementsSectionWithNav {...props} />;
}

function AnnouncementsSectionWithNav(props: AnnouncementsSectionProps) {
  const isFocused = useIsFocused();
  return <AnnouncementsSectionBase {...props} isFocused={isFocused} />;
}

function AnnouncementsSectionBase({ items, isFocused }: AnnouncementsSectionProps & { isFocused: boolean }) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const announcements = items && items.length ? items : [];
  const cardWidth = width;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => {
      const current = activeIndexRef.current;
      const nextIndex = current + 1 >= announcements.length ? 0 : current + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [announcements.length]);

  const isEmpty = announcements.length === 0;
  if (isEmpty) return null;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!cardWidth) return;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / cardWidth);
    if (index !== activeIndexRef.current) {
      activeIndexRef.current = index;
      setActiveIndex(index);
    }
  };

  const renderItem = ({ item }: { item: AnnouncementItem }) => {
    const parsed = extractAnnouncements(item);
    const title = item.title?.trim() || "Announcement";
    const date = item.updatedAt || item.createdAt;
    const dateLabel = date ? new Date(date).toLocaleDateString() : "";

    const imageWidth = Math.min(cardWidth - 8, 520);
    const imageHeight = Math.round(imageWidth * 0.62);
    const imagePadding = Math.max(0, (cardWidth - imageWidth) / 2);

    return (
      <View style={{ width: cardWidth }} className="items-center px-2">
        <View
          className="w-full p-8 rounded-[36px] shadow-xl"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 20,
            elevation: isDark ? 0 : 5,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold font-clash text-app tracking-tight">
                {title}
              </Text>
              {dateLabel ? (
                <Text className="text-sm font-outfit text-secondary mt-1">
                  {dateLabel}
                </Text>
              ) : null}
            </View>
          </View>

          {parsed.text ? (
            <View className="mt-4">
              <MarkdownText
                text={parsed.text}
                baseStyle={{ fontSize: 15, lineHeight: 24, color: "#64748B" }}
                headingStyle={{ fontSize: 18, lineHeight: 26, color: "#0F172A", fontWeight: "700" }}
                subheadingStyle={{ fontSize: 16, lineHeight: 24, color: "#0F172A", fontWeight: "700" }}
                listItemStyle={{ paddingLeft: 6 }}
              />
            </View>
          ) : null}

          {parsed.images.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-4"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: parsed.images.length === 1 ? imagePadding : 0,
              }}
            >
              {parsed.images.map((url) => (
                <View
                  key={url}
                  className="rounded-[24px] overflow-hidden"
                  style={{ width: imageWidth, height: imageHeight }}
                >
                  {imageErrors[url] ? (
                    <Image
                      source={{ uri: url }}
                      resizeMode="cover"
                      style={{ width: imageWidth, height: imageHeight }}
                    />
                  ) : (
                    <ExpoImage
                      source={{ uri: url }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      onError={() =>
                        setImageErrors((prev) => ({
                          ...prev,
                          [url]: true,
                        }))
                      }
                      style={{ width: imageWidth, height: imageHeight }}
                    />
                  )}
                </View>
              ))}
            </ScrollView>
          ) : null}

          {parsed.videos.length ? (
            <View className="mt-4 gap-3">
              {parsed.videos.map((url) => (
                <View key={url} className="overflow-hidden rounded-[24px]">
                  {isYoutubeUrl(url) ? (
                    <YouTubeEmbed url={url} shouldPlay={isFocused} />
                  ) : (
                    <VideoPlayer uri={url} title={title} autoPlay={isFocused} shouldPlay={isFocused} useVideoResolution />
                  )}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View className="py-2 items-center">
      <View className="w-full flex-row justify-between items-end mb-6 px-2">
        <View>
          <Text className="text-3xl font-bold font-telma-bold text-app tracking-tight">
            Announcements
          </Text>
          <Text className="text-secondary font-outfit text-base mt-1">
            Latest updates from the team
          </Text>
        </View>
        <View className="flex-row gap-2 mb-1">
          {announcements.map((_, i) => (
            <DotIndicator
              key={i}
              isActive={activeIndex === i}
              activeColor={colors.accent}
              inactiveColor={colors.textSecondary}
            />
          ))}
        </View>
      </View>

      <View className="w-full items-center">
        <FlatList
          ref={flatListRef}
          data={announcements}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          style={{ width: cardWidth }}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToAlignment="center"
          snapToInterval={cardWidth}
          decelerationRate="fast"
        />
      </View>
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
      transform: [{ scale: withSpring(isActive ? 1.1 : 0.9) }],
      opacity: withSpring(isActive ? 1 : 0.5),
      backgroundColor: isActive ? activeColor : inactiveColor,
    };
  }, [isActive, activeColor, inactiveColor]);

  return <Animated.View className="h-2 w-2 rounded-full" style={dotStyle} />;
}
