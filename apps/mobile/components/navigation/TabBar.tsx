import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  withSpring,
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
    const iconAnimatedStyle = useAnimatedStyle(() => {
      if (!scrollOffset) {
        const active = index === activeIndex;
        return {
          transform: [{ scale: active ? 1.2 : 1 }],
          opacity: active ? 1 : 0.6,
        };
      }

      const distance = Math.abs(scrollOffset.value - index);

      const scale = interpolate(distance, [0, 1], [1.2, 1], Extrapolate.CLAMP);

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

    return (
      <Pressable
        onPress={() => onTabPress(index)}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 8,
        }}
      >
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
            <Feather name={tab.icon} size={22} color={colors.tint} />
          </Animated.View>
          <Animated.View style={[inactiveTintStyle, { position: "absolute" }]}>
            <Feather name={tab.icon} size={22} color="#64748b" />
          </Animated.View>
        </Animated.View>

        <Animated.Text
          style={[
            {
              fontFamily: "Outfit-Medium",
              fontSize: 10,
              color: "#64748b",
              marginTop: 2,
            },
            iconAnimatedStyle,
          ]}
        >
          {tab.label}
        </Animated.Text>
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
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const tabWidth = 100 / tabs.length;

  const indicatorStyle = useAnimatedStyle(() => {
    if (scrollOffset) {
      const position = scrollOffset.value;
      const progress = position % 1;
      const index = Math.floor(position);

      const leadingEdge = interpolate(
        progress,
        [0, 0.5, 1],
        [0, 1, 1],
        Extrapolate.CLAMP,
      );

      const trailingEdge = interpolate(
        progress,
        [0, 0.5, 1],
        [0, 0, 1],
        Extrapolate.CLAMP,
      );

      return {
        left: `${(index + trailingEdge) * tabWidth}%`,
        width: `${(leadingEdge - trailingEdge + 1) * tabWidth}%`,
      };
    }
    return {
      left: withSpring(`${activeIndex * tabWidth}%`, {
        damping: 20,
        stiffness: 200,
      }),
      width: `${tabWidth}%`,
    };
  }, [activeIndex, tabWidth, scrollOffset]);

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom,
        height: (Platform.OS === "ios" ? 56 : 60) + insets.bottom,
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            height: 2,
            backgroundColor: colors.tint,
          },
          indicatorStyle,
        ]}
      />
      <View
        style={{
          flexDirection: "row",
          height: Platform.OS === "ios" ? 56 : 60,
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
