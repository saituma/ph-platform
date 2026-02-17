import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AnimatedText } from "@/components/ScaledText";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface TabConfig {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  badgeCount?: number;
}

interface TabBarProps {
  tabs: TabConfig[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  scrollOffset?: SharedValue<number>;
}

interface TabItemProps {
  tab: TabConfig;
  index: number;
  activeIndex: number;
  onTabPress: (index: number) => void;
  scrollOffset?: SharedValue<number>;
  colors: any;
}

function MenuGlyph({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 16,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 4,
        }}
      />
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 4,
        }}
      />
      <View
        style={{
          height: 2,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const TabItem = React.memo(
  ({
    tab,
    index,
    activeIndex,
    onTabPress,
    scrollOffset,
    colors,
  }: TabItemProps) => {
    const isHome = tab.key === "index";
    const activeBgStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return {
          opacity: index === activeIndex ? 1 : 0,
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const opacity = interpolate(distance, [0, 1], [1, 0], Extrapolate.CLAMP);
      return { opacity };
    }, [scrollOffset, index, activeIndex]);

    const iconAnimatedStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          transform: [{ scale: active ? 1.1 : 1 }],
          opacity: active ? 1 : 0.6,
        };
      }

      const distance = Math.abs(scrollOffset.value - index);

      const scale = interpolate(
        distance,
        [0, 1],
        [isHome ? 1.32 : 1.1, 1],
        Extrapolate.CLAMP,
      );

      const opacity = interpolate(
        distance,
        [0, 0.5, 1],
        [1, 0.8, 0.6],
        Extrapolate.CLAMP,
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    }, [scrollOffset, index, activeIndex, isHome]);

    const textAnimatedStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          color: active ? colors.tint : colors.textSecondary,
          opacity: active ? 1 : 0.7,
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const color = interpolateColor(
        distance,
        [0, 1],
        [colors.tint, colors.textSecondary],
      );
      const opacity = interpolate(
        distance,
        [0, 1],
        [1, 0.7],
        Extrapolate.CLAMP,
      );

      return { color, opacity };
    }, [scrollOffset, index, activeIndex, colors]);

    const activeTintStyle = useAnimatedStyle(() => {
      if (!scrollOffset) return { opacity: index === activeIndex ? 1 : 0 };
      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5],
        [1, 0],
        Extrapolate.CLAMP,
      );
      return { opacity };
    });

    const inactiveTintStyle = useAnimatedStyle(() => {
      if (!scrollOffset) return { opacity: index === activeIndex ? 0 : 1 };
      const distance = Math.abs(scrollOffset.value - index);
      const opacity = interpolate(
        distance,
        [0, 0.5],
        [0, 1],
        Extrapolate.CLAMP,
      );
      return { opacity };
    });

    const indicatorStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        return {
          width: index === activeIndex ? 20 : 8,
          opacity: index === activeIndex ? 1 : 0.35,
          backgroundColor:
            index === activeIndex ? colors.tint : colors.textSecondary,
        };
      }

      const distance = Math.min(Math.abs(scrollOffset.value - index), 1);
      const width = interpolate(distance, [0, 1], [20, 8], Extrapolate.CLAMP);
      const opacity = interpolate(
        distance,
        [0, 1],
        [1, 0.35],
        Extrapolate.CLAMP,
      );
      const backgroundColor = interpolateColor(
        distance,
        [0, 1],
        [colors.tint, colors.textSecondary],
      );

      return { width, opacity, backgroundColor };
    }, [scrollOffset, index, activeIndex, colors]);

    return (
      <Pressable
        onPress={() => onTabPress(index)}
        style={({ pressed }) => ({
          flexGrow: 1,
          flexBasis: 0,
          height: isHome ? 72 : 52,
          marginHorizontal: 0,
          borderRadius: isHome ? 20 : 16,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: isHome ? 2 : 6,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: -8,
              right: -8,
              borderRadius: 16,
              backgroundColor: "transparent",
              borderWidth: 0,
              borderColor: "transparent",
            },
            activeBgStyle,
          ]}
        />
        <Animated.View
          style={[
            iconAnimatedStyle,
            {
              position: "relative",
              width: isHome ? 42 : 26,
              height: isHome ? 42 : 26,
              alignItems: "center",
              justifyContent: "center",
              marginTop: isHome ? -8 : 0,
            },
          ]}
        >
          <Animated.View style={[activeTintStyle, { position: "absolute" }]}>
            {tab.key === "more" ? (
              <MenuGlyph color={colors.tint} />
            ) : (
              <Feather
                name={tab.icon}
                size={isHome ? 42 : 26}
                color={colors.tint}
              />
            )}
          </Animated.View>
          <Animated.View style={[inactiveTintStyle, { position: "absolute" }]}>
            {tab.key === "more" ? (
              <MenuGlyph color={colors.tabIconDefault} />
            ) : (
              <Feather
                name={tab.icon}
                size={isHome ? 42 : 26}
                color={colors.tabIconDefault}
              />
            )}
          </Animated.View>
          {tab.badgeCount && tab.badgeCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -8,
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: colors.danger,
                paddingHorizontal: 4,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatedText
                style={{
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontFamily: "Outfit-SemiBold",
                }}
                numberOfLines={1}
              >
                {tab.badgeCount > 99 ? "99+" : String(tab.badgeCount)}
              </AnimatedText>
            </View>
          ) : null}
        </Animated.View>

        {null}

        {isHome ? null : (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                height: 4,
                marginTop: 4,
                borderRadius: 999,
              },
              indicatorStyle,
            ]}
          />
        )}
      </Pressable>
    );
  },
);
TabItem.displayName = "TabItem";

export function TabBar({
  tabs,
  activeIndex,
  onTabPress,
  scrollOffset,
}: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const barHeight = Platform.OS === "ios" ? 56 : 60;
  const [barWidth, setBarWidth] = React.useState(0);
  const homeIndex = React.useMemo(
    () => tabs.findIndex((tab) => tab.key === "index"),
    [tabs],
  );
  const notchDiameter = 77;
  const notchRadius = notchDiameter / 2;
  const horizontalPadding = 8;
  const notchXOffset = 0;
  const innerWidth =
    barWidth && tabs.length ? Math.max(barWidth - horizontalPadding * 2, 0) : 0;
  const tabWidth = innerWidth && tabs.length ? innerWidth / tabs.length : 0;
  const notchLeft =
    innerWidth && homeIndex >= 0
      ? horizontalPadding +
        tabWidth * homeIndex +
        tabWidth / 2 -
        notchRadius +
        notchXOffset
      : 0;
  const notchTop = barHeight / 2 - notchRadius;

  return (
    <View
      style={{
        backgroundColor: "transparent",
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10 + insets.bottom,
        width: "100%",
        alignSelf: "stretch",
      }}
    >
      <View
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth !== barWidth) {
            setBarWidth(nextWidth);
          }
        }}
        style={{
          position: "relative",
          flexDirection: "row",
          width: "86%",
          alignSelf: "center",
          height: barHeight,
          marginHorizontal: 8,
          marginBottom: 6,
          backgroundColor: isDark
            ? "rgba(12, 14, 18, 0.78)"
            : "rgba(255, 255, 255, 0.92)",
          borderRadius: 28,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(15, 23, 42, 0.08)",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 6,
          shadowColor: "#0F172A",
          shadowOpacity: isDark ? 0.22 : 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: isDark ? 8 : 10,
        }}
      >
        {barWidth && homeIndex >= 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: notchTop,
              left: notchLeft,
              width: notchDiameter,
              height: notchDiameter,
              borderRadius: 999,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#0F172A",
              shadowOpacity: isDark ? 0 : 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: isDark ? 0 : 8,
            }}
          />
        ) : null}
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.key}
            tab={tab}
            index={index}
            activeIndex={activeIndex}
            onTabPress={onTabPress}
            scrollOffset={scrollOffset}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}
