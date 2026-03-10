import { useAppTheme } from "@/app/theme/AppThemeProvider";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import type {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from "react-native-pager-view";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { TabBar, TabConfig } from "./TabBar";
import { useTabVisibility } from "../../context/TabVisibilityContext";

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
  const { isTabBarVisible } = useTabVisibility();
  const pagerRef = useRef<{
    setPage: (index: number) => void;
    setPageWithoutAnimation: (index: number) => void;
  }>(null);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [PagerView, setPagerView] = useState<any>(null);
  const [visitedIndices, setVisitedIndices] = useState<number[]>([initialIndex]);

  const scrollOffset = useSharedValue(initialIndex);

  const lastSelectedIndex = useRef(initialIndex);
  const lastNotifiedIndex = useRef(initialIndex);
  const lastInitialIndex = useRef(initialIndex);
  const lastChangeSourceRef = useRef<"swipe" | "press" | "sync">("sync");

  const isSyncingRef = useRef(false);
  const isUserSwipingRef = useRef(false);

  const staticInitialPage = useRef(initialIndex);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    import("react-native-pager-view")
      .then((mod) => {
        if (!mounted) return;
        setPagerView(() => (mod as any).default ?? mod);
      })
      .catch(() => {
        if (!mounted) return;
        setPagerView(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialIndex === lastInitialIndex.current) {
      return;
    }

    lastInitialIndex.current = initialIndex;
    const needsSync = initialIndex !== activeIndex;
    if (!needsSync) return;
    if (isUserSwipingRef.current || isSyncingRef.current) return;

    setActiveIndex(initialIndex);
    setVisitedIndices((prev) => (prev.includes(initialIndex) ? prev : [...prev, initialIndex]));
    lastSelectedIndex.current = initialIndex;
    lastNotifiedIndex.current = initialIndex;

    pagerRef.current?.setPageWithoutAnimation(initialIndex);
  }, [initialIndex, activeIndex]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    scrollOffset.value = withTiming(activeIndex, {
      duration: 90,
      easing: Easing.out(Easing.quad),
    });
  }, [activeIndex, scrollOffset]);

  const handlePageScrollStateChanged = useCallback(
    (e: PageScrollStateChangedNativeEvent) => {
      const state = e.nativeEvent.pageScrollState;
      const idle = state === "idle";
      const dragging = state === "dragging";

      if (idle) {
        isSyncingRef.current = false;
        isUserSwipingRef.current = false;
        lastChangeSourceRef.current = "sync";
        return;
      }

      if (dragging) {
        isUserSwipingRef.current = true;
        lastChangeSourceRef.current = "swipe";
      }
    },
    [],
  );

  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const index = e.nativeEvent.position;
      lastSelectedIndex.current = index;
      setActiveIndex(index);
      setVisitedIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));

      if (lastNotifiedIndex.current !== index) {
        lastNotifiedIndex.current = index;
        const source =
          lastChangeSourceRef.current ||
          (isUserSwipingRef.current ? "swipe" : "sync");
        onIndexChange?.(index, source);
        lastChangeSourceRef.current = "sync";
      }
    },
    [onIndexChange],
  );

  const handlePageScroll = useCallback(
    (e: PagerViewOnPageScrollEvent) => {
      scrollOffset.value = e.nativeEvent.position + e.nativeEvent.offset;
    },
    [scrollOffset],
  );

  const handleTabPress = (index: number) => {
    if (index === lastSelectedIndex.current) return;

    import("expo-haptics")
      .then((Haptics) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      })
      .catch(() => {});

    isSyncingRef.current = true;
    lastChangeSourceRef.current = "press";
    if (Platform.OS !== "web") {
      scrollOffset.value = withTiming(index, {
        duration: 110,
        easing: Easing.out(Easing.quad),
      });
    }
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
    setVisitedIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));
    lastSelectedIndex.current = index;

    if (Platform.OS === "web") {
      if (lastNotifiedIndex.current !== index) {
        lastNotifiedIndex.current = index;
        onIndexChange?.(index, "press");
      }
      lastChangeSourceRef.current = "sync";
    }
  };


  const childrenArray = React.Children.toArray(children);

  const pagerChildren = useMemo(() => {
    return childrenArray.map((child, index) => {
      const key = tabs[index]?.key ?? `page-${index}`;
      const shouldRenderChild = index === activeIndex || visitedIndices.includes(index);
      return (
        <View key={key} style={styles.page}>
          {shouldRenderChild ? child : null}
        </View>
      );
    });
  }, [activeIndex, childrenArray, tabs, visitedIndices]);

  if (Platform.OS === "web" || !PagerView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.pager, { backgroundColor: colors.background }]}>
          {pagerChildren[activeIndex]}
        </View>
        {isTabBarVisible && (
          <TabBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
            scrollOffset={scrollOffset}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PagerView
        key={tabs.length}
        ref={pagerRef}
        style={[styles.pager, { backgroundColor: colors.background }]}
        initialPage={staticInitialPage.current}
        onPageSelected={handlePageSelected}
        onPageScroll={handlePageScroll}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        scrollEnabled={isTabBarVisible}
        overdrag={false}
        offscreenPageLimit={1}
      >
        {pagerChildren}
      </PagerView>
      {isTabBarVisible && (
        <TabBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          scrollOffset={scrollOffset}
        />
      )}
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
