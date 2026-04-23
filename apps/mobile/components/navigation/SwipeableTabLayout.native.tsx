import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  ActiveTabProvider,
  setGlobalActiveTab,
  subscribeToGlobalTabRequests,
} from "@/context/ActiveTabContext";
import { useTabVisibility } from "@/context/TabVisibilityContext";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NavigationContainerRefContext,
  NavigationContext,
  NavigationRouteContext,
} from "@react-navigation/native";
import { Platform, StyleSheet, View } from "react-native";
import PagerView, {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import { TabBar, TabConfig } from "./TabBar";

// Cache haptics module at the top level to avoid dynamic import on every press
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
  const { colors } = useAppTheme();
  const { isTabBarVisible } = useTabVisibility();
  const pagerRef = useRef<PagerView>(null);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    setGlobalActiveTab(activeIndex);
  }, [activeIndex]);

  const scrollOffset = useSharedValue(initialIndex);

  const lastSelectedIndex = useRef(initialIndex);
  const lastNotifiedIndex = useRef(initialIndex);
  const lastInitialIndex = useRef(initialIndex);
  const lastChangeSourceRef = useRef<"swipe" | "press" | "sync">("sync");

  const isSyncingRef = useRef(false);
  const isUserSwipingRef = useRef(false);

  const staticInitialPage = useRef(initialIndex);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Only react to route-driven `initialIndex` changes — not every swipe (avoids extra effect runs).
  useEffect(() => {
    if (initialIndex === lastInitialIndex.current) {
      return;
    }

    lastInitialIndex.current = initialIndex;
    const needsSync = initialIndex !== activeIndexRef.current;
    if (!needsSync) return;
    if (isUserSwipingRef.current || isSyncingRef.current) return;

    setActiveIndex(initialIndex);
    lastSelectedIndex.current = initialIndex;
    lastNotifiedIndex.current = initialIndex;

    pagerRef.current?.setPageWithoutAnimation(initialIndex);
    scrollOffset.value = initialIndex;
    // scrollOffset ref is stable (Reanimated shared value)
  }, [initialIndex]);

  useEffect(() => {
    return subscribeToGlobalTabRequests((index) => {
      if (index === lastSelectedIndex.current) return;
      handleTabPress(index);
    });
  }, []);

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
      scrollOffset.value = index;

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
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
    scrollOffset.value = index;
    lastSelectedIndex.current = index;

    setGlobalActiveTab(index);

    if (lastNotifiedIndex.current !== index) {
      lastNotifiedIndex.current = index;
      onIndexChange?.(index, "press");
    }
    lastChangeSourceRef.current = "sync";
  };

  // Stabilize children references to prevent PagerView from re-creating pages.
  // React.Children.toArray creates new references each render — but refresh when tab keys or child keys change.
  const rawChildren = React.Children.toArray(children);
  const fullSig = `${tabs.map((t) => t.key).join("|")}|${rawChildren.map((c) => String((c as React.ReactElement)?.key ?? "")).join("|")}`;
  const childrenRef = useRef<{ sig: string; nodes: React.ReactNode[] }>({ sig: "", nodes: [] });
  if (fullSig !== childrenRef.current.sig || rawChildren.length !== childrenRef.current.nodes.length) {
    childrenRef.current = { sig: fullSig, nodes: rawChildren };
  }
  const childrenArray = childrenRef.current.nodes;

  const navigationContext = React.useContext(NavigationContext);
  const routeContext = React.useContext(NavigationRouteContext);
  const containerRefContext = React.useContext(NavigationContainerRefContext);

  const pagerChildren = useMemo(() => {
    return childrenArray.map((child, index) => {
      const key = tabs[index]?.key ?? `page-${index}`;
      
      // Forward contexts because PagerView might break context propagation
      return (
        <View key={key} style={styles.page}>
          <NavigationContainerRefContext.Provider value={containerRefContext}>
            <NavigationContext.Provider value={navigationContext}>
              <NavigationRouteContext.Provider value={routeContext}>
                <ActiveTabProvider
                  activeTabIndex={activeIndex}
                  currentTabIndex={index}
                >
                  {child}
                </ActiveTabProvider>
              </NavigationRouteContext.Provider>
            </NavigationContext.Provider>
          </NavigationContainerRefContext.Provider>
        </View>
      );
    });
  }, [
    childrenArray,
    tabs,
    activeIndex,
    navigationContext,
    routeContext,
    containerRefContext,
  ]);

  // Android + native pickers (camera/library) can trigger transient remounts where PagerView breaks
  // React Navigation context propagation, causing "Couldn't find a navigation context" crashes.
  // Fallback to a non-PagerView implementation on non-iOS platforms (press-to-switch only).
  if (Platform.OS !== "ios") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.pager}>
          {childrenArray.map((child, index) => {
            const key = tabs[index]?.key ?? `page-${index}`;
            const isActive = index === activeIndex;
            return (
              <View
                key={key}
                style={[
                  StyleSheet.absoluteFillObject,
                  { display: isActive ? "flex" : "none" },
                ]}
              >
                <ActiveTabProvider activeTabIndex={activeIndex} currentTabIndex={index}>
                  {child}
                </ActiveTabProvider>
              </View>
            );
          })}
        </View>

        {isTabBarVisible ? (
          <View style={styles.tabBarWrapper}>
            <TabBar tabs={tabs} activeIndex={activeIndex} onTabPress={handleTabPress} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PagerView
        key={tabs.length}
        ref={pagerRef}
        style={styles.pager}
        initialPage={staticInitialPage.current}
        onPageSelected={handlePageSelected}
        onPageScroll={handlePageScroll}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        scrollEnabled={isTabBarVisible}
        overdrag={false}
        overScrollMode={Platform.OS === "ios" ? undefined : "never"}
        offscreenPageLimit={Math.min(4, Math.max(1, tabs.length - 1))}
      >
        {pagerChildren}
      </PagerView>

      {isTabBarVisible ? (
        <View style={styles.tabBarWrapper}>
          <TabBar
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
          />
        </View>
      ) : null}
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
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
