import type { PropsWithChildren, ReactElement } from "react";
import React, { useEffect, useState } from "react";
import {
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, "background");
  const colorScheme = useColorScheme() ?? "light";
  const [ReanimatedModule, setReanimatedModule] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      if (!NativeModules || !NativeModules.ReanimatedModule) {
        console.warn(
          "react-native-reanimated native module missing — using fallback ScrollView.",
        );
        return;
      }
    } catch {
      console.warn(
        "react-native-reanimated not available — using fallback ScrollView.",
      );
      return;
    }

    try {
      const R = require("react-native-reanimated");
      setReanimatedModule(R);
    } catch (e) {
      console.warn(
        "react-native-reanimated not available — using fallback ScrollView.",
      );
    }
  }, []);

  if (!ReanimatedModule) {
    return (
      <ScrollView style={{ backgroundColor, flex: 1 }} scrollEventThrottle={16}>
        <View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
          ]}
        >
          {headerImage}
        </View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    );
  }

  return (
    <ParallaxWithReanimated
      Reanimated={ReanimatedModule}
      backgroundColor={backgroundColor}
      colorScheme={colorScheme}
      headerBackgroundColor={headerBackgroundColor}
      headerImage={headerImage}
    >
      {children}
    </ParallaxWithReanimated>
  );
}

function ParallaxWithReanimated({
  Reanimated,
  backgroundColor,
  colorScheme,
  headerBackgroundColor,
  headerImage,
  children,
}: Props & {
  Reanimated: any;
  backgroundColor: string;
  colorScheme: "dark" | "light";
}) {
  const { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } =
    Reanimated;
  const scrollRef = useAnimatedRef();
  const scrollOffset = useScrollOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1],
          ),
        },
      ],
    };
  });

  const Animated = Reanimated.default ?? Reanimated;

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}
    >
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}
      >
        {headerImage}
      </Animated.View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: "hidden",
  },
});
