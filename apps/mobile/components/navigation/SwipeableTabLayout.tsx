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
import { NavigationContext, NavigationRouteContext, NavigationContainerRefContext } from "@react-navigation/native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";

let _hapticsPromise: Promise<any> | null = null;
const getHaptics = () => {
  if (!_hapticsPromise) {
    _hapticsPromise = import("expo-haptics").catch(() => null);
  }
  return _hapticsPromise;
};

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
  useAppTheme();
  const { isTabBarVisible } = useTabVisibility();
  const pagerRef = useRef<{
    setPage: (index: number) => void;
    setPageWithoutAnimation: (index: number) => void;
  }>(null);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [PagerView, setPagerView] = useState<any>(null);

  const [visitedSet, setVisitedSet] = useState<Set<number>>(
    () => new Set([initialIndex]),
  );

  const markVisited = useCallback((index: number) => {
    setVisitedSet((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const scrollOffset = useSharedValue(initialIndex);
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
    if (initialIndex === lastInitialIndex.current) return;

    lastInitialIndex.current = initialIndex;
    const needsSync = initialIndex !== activeIndex;
    if (!needsSync) return;
    if (isUserSwipingRef.current || isSyncingRef.current) return;

    setActiveIndex(initialIndex);
    markVisited(initialIndex);
    lastSelectedIndex.current = initialIndex;
    lastNotifiedIndex.current = initialIndex;

    pagerRef.current?.setPageWithoutAnimation(initialIndex);
  }, [initialIndex, activeIndex, markVisited]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    scrollOffset.value = withTiming(activeIndex, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  }, [activeIndex, scrollOffset]);

  const handlePageScrollStateChanged = useCallback(
    (e: PageScrollStateChangedNativeEvent) => {
      const state = e.nativeEvent.pageScrollState;

      if (state === "idle") {
        isSyncingRef.current = false;
        isUserSwipingRef.current = false;
        lastChangeSourceRef.current = "sync";
        return;
      }

      if (state === "dragging") {
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
      markVisited(index);

      if (lastNotifiedIndex.current !== index) {
        lastNotifiedIndex.current = index;
        const source =
          lastChangeSourceRef.current ||
          (isUserSwipingRef.current ? "swipe" : "sync");
        onIndexChange?.(index, source);
        lastChangeSourceRef.current = "sync";
      }

      setGlobalActiveTab(index);
    },
    [onIndexChange, markVisited],
  );

  const handlePageScroll = useCallback(
    (e: PagerViewOnPageScrollEvent) => {
      scrollOffset.value = e.nativeEvent.position + e.nativeEvent.offset;
    },
    [scrollOffset],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      if (index === lastSelectedIndex.current) return;

      getHaptics()?.then((Haptics: any) => {
        Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(
          () => {},
        );
      });

      isSyncingRef.current = true;
      lastChangeSourceRef.current = "press";

      pagerRef.current?.setPage(index);
      setActiveIndex(index);
      markVisited(index);
      lastSelectedIndex.current = index;
      setGlobalActiveTab(index);

      if (lastNotifiedIndex.current !== index) {
        lastNotifiedIndex.current = index;
        onIndexChange?.(index, "press");
      }
    },
    [onIndexChange, markVisited],
  );

  useEffect(() => {
    return subscribeToGlobalTabRequests((index) => {
      if (index === lastSelectedIndex.current) return;
      handleTabPress(index);
    });
  }, [handleTabPress]);

  const childrenRef = useRef<React.ReactNode[]>([]);
  const rawChildren = React.Children.toArray(children);
  if (rawChildren.length !== childrenRef.current.length) {
    childrenRef.current = rawChildren;
  } else {
    const keysChanged = rawChildren.some((child, i) => {
      const prev = childrenRef.current[i];
      return (child as any)?.key !== (prev as any)?.key;
    });
    if (keysChanged) {
      childrenRef.current = rawChildren;
    }
  }
  const childrenArray = childrenRef.current;

  const navigationContext = React.useContext(NavigationContext);
  const routeContext = React.useContext(NavigationRouteContext);
  const containerRefContext = React.useContext(NavigationContainerRefContext);

  const pagerChildren = useMemo(() => {
    return childrenArray.map((child, index) => {
      const key = tabs[index]?.key ?? `page-${index}`;
      const shouldRenderChild = visitedSet.has(index);

      return (
        <View
          key={key}
          style={[styles.page, { backgroundColor: "transparent" }]}
        >
          <NavigationContainerRefContext.Provider value={containerRefContext}>
            <NavigationContext.Provider value={navigationContext}>
              <NavigationRouteContext.Provider value={routeContext}>
                {shouldRenderChild ? (
                  <ActiveTabProvider
                    activeTabIndex={index}
                    currentTabIndex={index}
                  >
                    {child}
                  </ActiveTabProvider>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </NavigationRouteContext.Provider>
            </NavigationContext.Provider>
          </NavigationContainerRefContext.Provider>
        </View>
      );
    });
  }, [
    childrenArray,
    tabs,
    visitedSet,
    navigationContext,
    routeContext,
    containerRefContext,
  ]);

  if (Platform.OS === "web" || !PagerView) {
    return (
      <View style={styles.container}>
        <View style={styles.pager}>
          {pagerChildren.map((page, index) => (
            <View
              key={index}
              style={[
                StyleSheet.absoluteFillObject,
                { display: index === activeIndex ? "flex" : "none" },
              ]}
            >
              {page}
            </View>
          ))}
        </View>
        {isTabBarVisible && (
          <View style={styles.tabBarWrapper} pointerEvents="box-none">
            <TabBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
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
