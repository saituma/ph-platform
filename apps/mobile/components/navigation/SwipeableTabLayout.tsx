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
  onIndexChange?: (index: number) => void;
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

  const [isSettled, setIsSettled] = useState(true);

  const scrollOffset = useSharedValue(initialIndex);

  const lastSelectedIndex = useRef(initialIndex);
  const prevInitialIndex = useRef(initialIndex);

  const isSyncingRef = useRef(false);

  const staticInitialPage = useRef(initialIndex);

  useEffect(() => {
    const hasExternalChange = initialIndex !== lastSelectedIndex.current;

    if (hasExternalChange) {
      setActiveIndex(initialIndex);
      lastSelectedIndex.current = initialIndex;

      if (isSettled && !isSyncingRef.current) {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      }
    }

    prevInitialIndex.current = initialIndex;
  }, [initialIndex, isSettled]);

  const handlePageScrollStateChanged = useCallback(
    (e: PageScrollStateChangedNativeEvent) => {
      const state = e.nativeEvent.pageScrollState;
      const idle = state === "idle";

      if (idle) {
        setIsSettled(true);
        isSyncingRef.current = false;

        if (lastSelectedIndex.current !== initialIndex) {
          onIndexChange?.(lastSelectedIndex.current);
        }
      } else {
        setIsSettled(false);
      }
    },
    [initialIndex, onIndexChange],
  );

  const handlePageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    const index = e.nativeEvent.position;
    lastSelectedIndex.current = index;
    setActiveIndex(index);
  }, []);

  const handlePageScroll = (e: PagerViewOnPageScrollEvent) => {
    "worklet";
    scrollOffset.value = e.nativeEvent.position + e.nativeEvent.offset;
  };

  const handleTabPress = (index: number) => {
    if (index === lastSelectedIndex.current) return;

    import("expo-haptics")
      .then((Haptics) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      })
      .catch(() => {});

    isSyncingRef.current = true;
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
        overdrag={true}
        offscreenPageLimit={1}
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
