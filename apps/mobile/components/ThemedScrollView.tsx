import { useRefreshContext } from "@/context/RefreshContext";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { RefreshControl, ScrollViewProps, View } from "react-native";
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";

interface ThemedScrollViewProps extends ScrollViewProps {
  onRefresh?: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function ThemedScrollView({
  onRefresh,
  children,
  disabled = false,
  ...props
}: ThemedScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const { setIsLoading } = useRefreshContext();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleRefresh = async () => {
    if (!onRefresh || disabled) return;
    setRefreshing(true);
    setIsLoading(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  const animatedHeaderStyle = useAnimatedStyle(() => {
    if (!onRefresh || disabled) return { opacity: 0 };

    const opacity = interpolate(
      scrollY.value,
      [-60, 0],
      [1, 0],
      Extrapolate.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-60, 0],
      [1, 0.5],
      Extrapolate.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }],
      height: 60,
      position: "absolute",
      top: -60,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
    };
  });

  return (
    <View style={{ flex: 1 }}>
      {onRefresh && !disabled && (
        <Animated.View style={animatedHeaderStyle}>
          <View className="bg-accent-light p-2 rounded-full shadow-sm">
            <Feather name="refresh-cw" size={20} className="text-accent" />
          </View>
        </Animated.View>
      )}
      <Animated.ScrollView
        {...props}
        scrollEnabled={!disabled && (props.scrollEnabled ?? true)}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh && !disabled ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={["transparent"]}
            />
          ) : undefined
        }
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}
