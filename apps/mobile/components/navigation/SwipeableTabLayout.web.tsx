import { useAppTheme } from "@/app/theme/AppThemeProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { TabBar, TabConfig } from "./TabBar";

interface SwipeableTabLayoutProps {
  tabs: TabConfig[];
  children: React.ReactNode[];
  initialIndex?: number;
  onIndexChange?: (index: number, source: "swipe" | "press" | "sync") => void;
}

export function SwipeableTabLayout({
  tabs,
  children,
  initialIndex = 0,
  onIndexChange,
}: SwipeableTabLayoutProps) {
  const { colors } = useAppTheme();

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollOffset = useSharedValue(initialIndex);

  const lastNotifiedIndex = useRef(initialIndex);
  const lastInitialIndex = useRef(initialIndex);

  useEffect(() => {
    if (initialIndex === lastInitialIndex.current) return;

    lastInitialIndex.current = initialIndex;
    setActiveIndex(initialIndex);
    scrollOffset.value = initialIndex;

    if (lastNotifiedIndex.current !== initialIndex) {
      lastNotifiedIndex.current = initialIndex;
      onIndexChange?.(initialIndex, "sync");
    }
  }, [initialIndex, onIndexChange, scrollOffset]);

  const handleTabPress = (index: number) => {
    if (index === activeIndex) return;

    import("expo-haptics")
      .then((Haptics) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      })
      .catch(() => {});

    setActiveIndex(index);
    scrollOffset.value = index;

    if (lastNotifiedIndex.current !== index) {
      lastNotifiedIndex.current = index;
      onIndexChange?.(index, "press");
    }
  };

  const childrenArray = React.Children.toArray(children);

  const pagerChildren = useMemo(() => {
    return childrenArray.map((child, index) => {
      const key = tabs[index]?.key ?? `page-${index}`;
      return (
        <View key={key} style={styles.page}>
          {child}
        </View>
      );
    });
  }, [childrenArray, tabs]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.pager, { backgroundColor: colors.background }]}>
        {pagerChildren[activeIndex]}
      </View>
      <TabBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        scrollOffset={scrollOffset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});