import { useAppTheme } from "@/app/theme/AppThemeProvider";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";

// Cache haptics module at the top level to avoid dynamic import on every press
let _hapticsPromise: Promise<any> | null = null;
const getHaptics = () => {
  if (!_hapticsPromise) {
    _hapticsPromise = import("expo-haptics").catch(() => null);
  }
  return _hapticsPromise;
};
import type {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from "react-native-pager-view";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { TabBar, TabConfig } from "./TabBar";
import { useTabVisibility } from "@/context/TabVisibilityContext";
import {
  ActiveTabProvider,
  setGlobalActiveTab,
  subscribeToGlobalTabRequests,
} from "@/context/ActiveTabContext";
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
  // Use a ref instead of state to track visited indices — avoids re-renders
  // when a tab is visited for the first time.
  const visitedRef = useRef<Set<number>>(new Set([initialIndex]));

  const scrollOffset = useSharedValue(initialIndex);

  setGlobalActiveTab(activeIndex);
  useEffect(() => {
    setGlobalActiveTab(activeIndex);
  }, [activeIndex]);

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
    visitedRef.current.add(initialIndex);
    lastSelectedIndex.current = initialIndex;
    lastNotifiedIndex.current = initialIndex;

    pagerRef.current?.setPageWithoutAnimation(initialIndex);
  }, [initialIndex, activeIndex]);

  useEffect(() => {
    return subscribeToGlobalTabRequests((index) => {
      if (index === lastSelectedIndex.current) return;
      handleTabPress(index);
    });
  }, []);

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
      visitedRef.current.add(index);

      if (lastNotifiedIndex.current !== index) {
        lastNotifiedIndex.current = index;
        const source =
          lastChangeSourceRef.current ||
          (isUserSwipingRef.current ? "swipe" : "sync");
        onIndexChange?.(index, source);
        lastChangeSourceRef.current = "sync";
      }

      // Guarantee global context update regardless of platform or routing
      setGlobalActiveTab(index);
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

    // Use cached haptics module
    getHaptics()?.then((Haptics: any) => {
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    });

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
    visitedRef.current.add(index);
    lastSelectedIndex.current = index;

    // Guarantee global context update regardless of platform or routing
    setGlobalActiveTab(index);

    if (lastNotifiedIndex.current !== index) {
      lastNotifiedIndex.current = index;
      onIndexChange?.(index, "press");
    }
    lastChangeSourceRef.current = "sync";
  };


  // Stabilize children references to prevent ActiveTabProvider remounts.
  // React.Children.toArray creates new references each render, which would
  // cause the provider to unmount/remount and reset video player state.
  const childrenRef = useRef<React.ReactNode[]>([]);
  const rawChildren = React.Children.toArray(children);
  if (rawChildren.length !== childrenRef.current.length) {
    childrenRef.current = rawChildren;
  } else {
    // Only update when keys actually change (role switch etc.)
    const keysChanged = rawChildren.some((child, i) => {
      const prev = childrenRef.current[i];
      return (child as any)?.key !== (prev as any)?.key;
    });
    if (keysChanged) {
      childrenRef.current = rawChildren;
    }
  }
  const childrenArray = childrenRef.current;

  // PERF: pagerChildren does NOT depend on activeIndex.
  // Active state flows through the global emitter (setGlobalActiveTab)
  // and each page reads it via useActiveTabIndex(). This prevents all 6
  // pages from re-rendering every time the user changes tabs.
  const pagerChildren = useMemo(() => {
    return childrenArray.map((child, index) => {
      const key = tabs[index]?.key ?? `page-${index}`;
      // On first render, only mount the initial page. Subsequent pages get
      // mounted when the user visits them (tracked via visitedRef).
      const shouldRenderChild = visitedRef.current.has(index);
      
      return (
        <View key={key} style={[styles.page, { backgroundColor: "transparent" }]}>
          {shouldRenderChild ? (
            <ActiveTabProvider activeTabIndex={index} currentTabIndex={index}>
              {child}
            </ActiveTabProvider>
          ) : (
             <View style={{ flex: 1 }} />
          )}
        </View>
      );
    });
  }, [childrenArray, tabs]);

  if (Platform.OS === "web" || !PagerView) {
    return (
      <View style={styles.container}>
        <View style={styles.pager}>
          {pagerChildren[activeIndex]}
        </View>
        {isTabBarVisible && (
          <View style={styles.tabBarWrapper} pointerEvents="box-none">
            <TabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              scrollOffset={scrollOffset}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        key={tabs.length}
        ref={pagerRef}
        style={[styles.pager, { backgroundColor: "transparent" }]}
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
        <View style={styles.tabBarWrapper} pointerEvents="box-none">
          <TabBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
            scrollOffset={scrollOffset}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  pager: {
    flex: 1,
    backgroundColor: "transparent",
  },
  page: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
