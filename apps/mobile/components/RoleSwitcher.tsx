import { PinModal } from "@/components/PinModal";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRole } from "@/context/RoleContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export function RoleSwitcher() {
  const { role, setRole, guardianPin, checkPin } = useRole();
  const { colors } = useAppTheme();

  const initialWidth = Dimensions.get("window").width - 56;
  const [containerWidth, setContainerWidth] = React.useState(initialWidth);
  const activeIndex = useSharedValue(role === "Guardian" ? 0 : 1);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>();

  useEffect(() => {
    activeIndex.value = withSpring(role === "Guardian" ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [role]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const handleRoleChange = (newRole: "Guardian" | "Athlete") => {
    if (role === newRole) return;

    if (newRole === "Guardian" && guardianPin) {
      setPinError(undefined);
      setIsPinModalVisible(true);
      return;
    }

    performRoleSwitch(newRole);
  };

  const performRoleSwitch = (newRole: "Guardian" | "Athlete") => {
    if (process.env.EXPO_OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRole(newRole);
  };

  const handlePinSuccess = (pin: string) => {
    if (checkPin(pin)) {
      setIsPinModalVisible(false);
      performRoleSwitch("Guardian");
    } else {
      setPinError("Incorrect PIN");
    }
  };

  const indicatorWidth = containerWidth ? (containerWidth - 8) / 2 : 0;

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(activeIndex.value * indicatorWidth, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
      width: indicatorWidth,
      backgroundColor: colors.accent,
    };
  });

  return (
    <View className="mb-0 overflow-hidden">
      <View className="flex-row items-center justify-between mb-4 px-1">
        <View className="flex-row items-center gap-3">
          <View className="bg-secondary p-2.5 rounded-full shadow-sm">
            <Feather name="repeat" size={18} className="text-app" />
          </View>
          <View>
            <Text className="text-lg font-bold font-clash text-app leading-tight">
              Switch Profile
            </Text>
            <Text className="text-xs font-outfit text-secondary font-medium tracking-wide">
              MANAGE APP AS
            </Text>
          </View>
        </View>
      </View>

      <View
        className="flex-row bg-input rounded-3xl p-4 border border-app shadow-inner relative h-[64px] items-center"
        onLayout={handleLayout}
      >
        {containerWidth > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 1,
                bottom: 1,
                left: 1,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.border,
                elevation: 1,
              },
              animatedIndicatorStyle,
            ]}
          />
        )}

        <RoleOption
          label="Guardian"
          icon="shield"
          isActive={role === "Guardian"}
          onPress={() => handleRoleChange("Guardian")}
        />
        <RoleOption
          label="Athlete"
          icon="activity"
          isActive={role === "Athlete"}
          onPress={() => handleRoleChange("Athlete")}
        />
      </View>

      <PinModal
        visible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handlePinSuccess}
        title="Enter Guardian PIN"
        subtitle="Enter your PIN to switch to Guardian mode"
        error={pinError}
      />
    </View>
  );
}

function RoleOption({
  label,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: any;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 h-full flex-row items-center justify-center gap-2 z-10"
      hitSlop={8}
    >
      <Feather
        name={icon}
        size={18}
        // Active: white. Inactive: text-secondary.
        className={isActive ? "text-white" : "text-secondary"}
      />
      <Text
        className={`font-semibold font-outfit text-base ${
          isActive ? "text-white" : "text-secondary"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
