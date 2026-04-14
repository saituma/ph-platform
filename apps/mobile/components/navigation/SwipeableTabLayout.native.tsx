import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  ActiveTabProvider,
  setGlobalActiveTab,
  subscribeToGlobalTabRequests,
} from "@/context/ActiveTabContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const barHeight = Platform.OS === "ios" ? 64 : 68;

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const scrollOffset = useSharedValue(initialIndex);

  const lastSelectedIndex = useRef(initialIndex);
  const lastNotifiedIndex = useRef(initialIndex);
  const lastInitialIndex = useRef(initialIndex);
  const lastChangeSourceRef = useRef<"swipe" | "press" | "sync">("sync");

  const isSyncingRef = useRef(false);
  const isUserSwipingRef = useRef(false);

  const staticInitialPage = useRef(initialIndex);

  useEffect(() => {
    if (initialIndex === lastInitialIndex.current) {
      return;
    }

    lastInitialIndex.current = initialIndex;
    const needsSync = initialIndex !== activeIndex;
    if (!needsSync) return;
    if (isUserSwipingRef.current || isSyncingRef.current) return;

    setActiveIndex(initialIndex);
    lastSelectedIndex.current = initialIndex;
    lastNotifiedIndex.current = initialIndex;

    pagerRef.current?.setPageWithoutAnimation(initialIndex);
    scrollOffset.value = initialIndex;
  }, [initialIndex, activeIndex]);

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
  // React.Children.toArray creates new references each render.
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
  }, [childrenArray, tabs, activeIndex, navigationContext, routeContext, containerRefContext]);

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
        scrollEnabled={true}
        overdrag={false}
        overScrollMode={Platform.OS === "android" ? "never" : undefined}
        offscreenPageLimit={Math.min(4, Math.max(1, tabs.length - 1))}
      >
        {pagerChildren}
      </PagerView>
      
      <View style={styles.tabBarWrapper}>
        <TabBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
        />
      </View>
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
