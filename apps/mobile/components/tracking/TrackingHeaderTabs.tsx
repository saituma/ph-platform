import React, { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { useRouter } from "expo-router";

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
            containerBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(120,120,128,0.12)",
            activeBg: isDark ? "rgba(255,255,255,0.14)" : "#FFFFFF",
            inactiveText: isDark ? "rgba(255,255,255,0.55)" : "rgba(60,60,67,0.6)",
            activeText: isDark ? "#FFFFFF" : "#000000",
            shadowColor: isDark ? "#000" : "rgba(0,0,0,0.04)",
            ripple: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
        };
    }, [isDark]);

    const handleTabPress = useCallback(
        (tab: TabItem) => {
            if (tab.key === active) return;
            // @ts-ignore - Expo router types can be strict depending on config
            router.replace(tab.route);
        },
        [active, router],
    );

    // Single tab → render a plain title, not a lonely segmented control
    if (!showTeamTab) {
        return (
            <View
                style={[
                    styles.outer,
                    {
                        paddingTop: topInset + 8,
                        paddingHorizontal,
                        paddingBottom: spacing.sm,
                    },
                ]}
            >
                <Text
                    style={{
                        fontFamily: fonts.heading1,
                        fontSize: 28,
                        color: colors.textPrimary,
                        letterSpacing: -0.3,
                    }}
                >
                    Running
                </Text>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.outer,
                {
                    paddingTop: topInset + 6,
                    paddingHorizontal,
                    paddingBottom: spacing.sm,
                },
            ]}
        >
            <View
                accessibilityRole="tablist"
                style={[
                    styles.segmentedControl,
                    { backgroundColor: theme.containerBg },
                ]}
            >
                {visibleTabs.map((tab) => {
                    const selected = tab.key === active;

                    return (
                        <HeaderTabButton
                            key={tab.key}
                            label={tab.label}
                            selected={selected}
                            activeBg={theme.activeBg}
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
    activeBg: string;
    activeTextColor: string;
    inactiveTextColor: string;
    shadowColor: string;
    rippleColor: string;
    onPress: () => void;
};

const HeaderTabButton = memo(function HeaderTabButton({
    label,
    selected,
    activeBg,
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
                selected && { shadowColor, backgroundColor: activeBg },
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
                    pressed && !selected && styles.pressedTabButton,
                ]}
            >
                <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    style={[
                        styles.tabLabel,
                        {
                            color: selected ? activeTextColor : inactiveTextColor,
                            fontFamily: selected ? fonts.heading3 : fonts.bodyMedium,
                        },
                    ]}
                >
                    {label}
                </Text>
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
        alignItems: "stretch",
        padding: 3,
        borderRadius: 10,
        minHeight: 36,
    },
    tabContainer: {
        flex: 1,
        borderRadius: 8,
        alignSelf: "stretch",
        justifyContent: "center",
    },
    activeTabContainer: {
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    tabButton: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        minHeight: 0,
        paddingHorizontal: 10,
        paddingVertical: 0,
        overflow: "hidden",
    },
    pressedTabButton: {
        opacity: 0.7,
    },
    tabLabel: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
        letterSpacing: 0,
        includeFontPadding: false,
    },
});
