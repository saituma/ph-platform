import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export interface FeelTag {
  id: string;
  label: string;
  icon: any;
}

export const FEEL_TAGS: FeelTag[] = [
  { id: "1", label: "Easy", icon: themeIcons.effortEasy },
  { id: "2", label: "Recovery", icon: themeIcons.heart },
  { id: "3", label: "Long Run", icon: themeIcons.route },
  { id: "4", label: "Tempo", icon: themeIcons.pace },
  { id: "5", label: "Intervals", icon: themeIcons.timer },
  { id: "6", label: "Hills", icon: themeIcons.gpsActive },
  { id: "7", label: "Race", icon: themeIcons.trophy },
  { id: "8", label: "Treadmill", icon: themeIcons.run },
];

interface FeelTagSelectorProps {
  selectedKeys: string[];
  onToggle: (id: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TagPill = ({
  tag,
  isSelected,
  onPress,
}: {
  tag: FeelTag;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const { colors, isDark } = useAppTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(0.92, { damping: 8, stiffness: 400 }),
        withSpring(1.04, { damping: 10, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 }),
      );
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const IconComponent =
    tag.icon.lib === "Ionicons" ? Ionicons : MaterialCommunityIcons;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        animatedStyle,
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isSelected ? colors.accent : colors.cardElevated,
          borderWidth: 1,
          borderColor: isSelected ? colors.accent : colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: 14,
          paddingVertical: 9,
          ...(isDark || !isSelected
            ? {}
            : {
                shadowColor: colors.accent,
                shadowOpacity: 0.14,
                shadowRadius: 12,
                elevation: 3,
              }),
        },
      ]}
    >
      <IconComponent
        name={tag.icon.name as any}
        size={14}
        color={isSelected ? colors.textInverse : colors.textSecondary}
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          fontFamily: fonts.accent, // ClashDisplay-Semibold
          fontSize: 13,
          color: isSelected ? colors.textInverse : colors.textSecondary,
        }}
      >
        {tag.label}
      </Text>
    </AnimatedPressable>
  );
};

export const FeelTagSelector = ({
  selectedKeys,
  onToggle,
}: FeelTagSelectorProps) => {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {FEEL_TAGS.map((tag) => (
        <TagPill
          key={tag.id}
          tag={tag}
          isSelected={selectedKeys.includes(tag.id)}
          onPress={() => onToggle(tag.id)}
        />
      ))}
    </View>
  );
};
