import { useAppTheme } from "@/app/theme/AppThemeProvider";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import PagerView, {
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
  PageScrollStateChangedNativeEvent,
} from "react-native-pager-view";
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
  const pagerRef = useRef<PagerView>(null);

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
  }, [initialIndex, activeIndex]);

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
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
    lastSelectedIndex.current = index;
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
      <PagerView
        key={tabs.length}
        ref={pagerRef}
        style={[styles.pager, { backgroundColor: colors.background }]}
        initialPage={staticInitialPage.current}
        onPageSelected={handlePageSelected}
        onPageScroll={handlePageScroll}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        scrollEnabled={true}
        overdrag={false}
        offscreenPageLimit={Math.min(4, Math.max(1, tabs.length - 1))}
      >
        {pagerChildren}
      </PagerView>
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
