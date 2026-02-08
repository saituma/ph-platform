import { useAppTheme } from "@/app/theme/AppThemeProvider";
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

const TabItem = React.memo(
  ({
    tab,
    index,
    activeIndex,
    onTabPress,
    scrollOffset,
    colors,
  }: TabItemProps) => {
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

      const scale = interpolate(distance, [0, 1], [1.1, 1], Extrapolate.CLAMP);

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
    }, [scrollOffset, index, activeIndex]);

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
      const opacity = interpolate(distance, [0, 1], [1, 0.7], Extrapolate.CLAMP);

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
          height: 52,
          marginHorizontal: 0,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 6,
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
              backgroundColor: colors.accentLight,
              borderWidth: 1,
              borderColor: colors.border,
            },
            activeBgStyle,
          ]}
        />
        <Animated.View
          style={[
            iconAnimatedStyle,
            {
              position: "relative",
              width: 24,
              height: 24,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Animated.View style={[activeTintStyle, { position: "absolute" }]}>
            <Feather name={tab.icon} size={24} color={colors.tint} />
          </Animated.View>
          <Animated.View style={[inactiveTintStyle, { position: "absolute" }]}>
            <Feather
              name={tab.icon}
              size={24}
              color={colors.tabIconDefault}
            />
          </Animated.View>
        </Animated.View>

        <Animated.Text
          style={[
            {
              fontFamily: "Outfit-Medium",
              fontSize: 11,
              marginTop: 2,
            },
            iconAnimatedStyle,
            textAnimatedStyle,
          ]}
        >
          {tab.label}
        </Animated.Text>

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
      </Pressable>
    );
  },
);

export function TabBar({
  tabs,
  activeIndex,
  onTabPress,
  scrollOffset,
}: TabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8 + insets.bottom,
        width: "100%",
        alignSelf: "stretch",
      }}
    >
      <View
        style={{
          position: "relative",
          flexDirection: "row",
          width: "100%",
          alignSelf: "stretch",
          height: Platform.OS === "ios" ? 56 : 60,
          backgroundColor: colors.backgroundSecondary,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 6,
          shadowColor: "#0F172A",
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: isDark ? 0 : 6,
        }}
      >
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
