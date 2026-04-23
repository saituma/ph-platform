import React, { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useRouter } from "expo-router";

// Assuming these exist in your project
import { fonts, spacing } from "@/constants/theme";

type ActiveTab = "running" | "team";

type TrackingHeaderTabsProps = {
    active: ActiveTab;
    colors: Record<string, string>;
    isDark: boolean;
    topInset?: number;
    paddingHorizontal?: number;
    showTeamTab?: boolean;
};

type TabItem = {
    key: ActiveTab;
    label: string;
    route: string;
};

const TAB_ITEMS: TabItem[] = [
    { key: "running", label: "Running", route: "/(tabs)/tracking" },
    { key: "team", label: "Team", route: "/(tabs)/tracking/social" },
];

export const TrackingHeaderTabs = memo(function TrackingHeaderTabs({
    active,
    colors,
    isDark,
    topInset = 0,
    paddingHorizontal = 16,
    showTeamTab = true,
}: TrackingHeaderTabsProps) {
    const router = useRouter();

    const visibleTabs = useMemo(
        () => (showTeamTab ? TAB_ITEMS : TAB_ITEMS.filter((tab) => tab.key === "running")),
        [showTeamTab],
    );

    const theme = useMemo(() => {
        return {
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
            containerBackground: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            activeBackground: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)",
            inactiveText: isDark ? "rgba(255,255,255,0.60)" : colors.textSecondary,
            activeText: colors.textPrimary,
            shadowColor: isDark ? "#000" : "#0F172A",
            ripple: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        };
    }, [colors.textPrimary, colors.textSecondary, isDark]);

    const handleTabPress = useCallback(
        (tab: TabItem) => {
            if (tab.key === active) return;
            // @ts-ignore - Expo router types can be strict depending on config
            router.replace(tab.route);
        },
        [active, router],
    );

    return (
        <View
            style={[
                styles.outer,
                {
                    paddingTop: topInset,
                    paddingHorizontal,
                    paddingBottom: spacing.md,
                },
            ]}
        >
            <View
                accessibilityRole="tablist"
                style={[
                    styles.segmentedControl,
                    {
                        backgroundColor: theme.containerBackground,
                        borderColor: theme.borderColor,
                    },
                ]}
            >
                {visibleTabs.map((tab) => {
                    const selected = tab.key === active;

                    return (
                        <HeaderTabButton
                            key={tab.key}
                            label={tab.label}
                            selected={selected}
                            activeBackground={theme.activeBackground}
                            activeTextColor={theme.activeText}
                            inactiveTextColor={theme.inactiveText}
                            shadowColor={theme.shadowColor}
                            rippleColor={theme.ripple}
                            onPress={() => handleTabPress(tab)}
                        />
                    );
                })}
            </View>
        </View>
    );
});

type HeaderTabButtonProps = {
    label: string;
    selected: boolean;
    activeBackground: string;
    activeTextColor: string;
    inactiveTextColor: string;
    shadowColor: string;
    rippleColor: string;
    onPress: () => void;
};

const HeaderTabButton = memo(function HeaderTabButton({
    label,
    selected,
    activeBackground,
    activeTextColor,
    inactiveTextColor,
    shadowColor,
    rippleColor,
    onPress,
}: HeaderTabButtonProps) {
    return (
        <View
            style={[
                styles.tabContainer,
                selected && styles.activeTabContainer,
                selected && { shadowColor },
            ]}
        >
            <Pressable
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={onPress}
                android_ripple={{ color: rippleColor, borderless: false }}
                style={({ pressed }) => [
                    styles.tabButton,
                    selected && { backgroundColor: activeBackground },
                    pressed && !selected && styles.pressedTabButton,
                ]}
            >
                <View style={styles.tabLabelWrap}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        maxFontSizeMultiplier={1.2}
                        style={[
                            styles.tabLabel,
                            {
                                color: selected ? activeTextColor : inactiveTextColor,
                                fontFamily: selected ? fonts.heading2 : fonts.bodyBold,
                                fontSize: selected ? 16 : 15,
                                lineHeight: selected ? 18 : 17,
                            },
                        ]}
                    >
                        {label}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    outer: {
        width: "100%",
        alignSelf: "stretch",
    },
    segmentedControl: {
        flexDirection: "row",
        alignItems: "stretch", // Ensures tabs stretch to fill the height equally
        padding: 4,
        borderWidth: 1,
        borderRadius: 18,
        minHeight: 52,
    },
    tabContainer: {
        flex: 1,
        borderRadius: 14,
        alignSelf: "stretch",
        justifyContent: "center",
    },
    activeTabContainer: {
        // Shadow is applied to the wrapper so overflow:hidden on the button doesn't clip it on iOS
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    tabButton: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        minHeight: 0,
        paddingHorizontal: 12,
        paddingVertical: 0,
        overflow: "hidden", // Keeps Android ripple inside the border radius
    },
    pressedTabButton: {
        opacity: 0.82,
    },
    tabLabel: {
        width: "100%",
        textAlign: "center",
        letterSpacing: 0,
        includeFontPadding: false, // Helps center text vertically on Android
    },
    tabLabelWrap: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
});
