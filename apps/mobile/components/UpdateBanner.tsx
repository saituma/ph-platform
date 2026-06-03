import React, { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useUpdates } from "expo-updates";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, X } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { colors, fonts } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { fetchAppVersionInfo, compareVersions } from "@/services/appUpdate";

/**
 * Global soft "update available" banner. An OTA update that landed while the app was open
 * (left pending by useOtaUpdater) offers tap-to-refresh; a newer native build in the store
 * offers tap-to-open-store. Renders nothing when there is no update or once dismissed.
 */
export function UpdateBanner() {
  const insets = useAppSafeAreaInsets();
  const { isUpdatePending } = useUpdates();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchAppVersionInfo,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });

  const installed = Constants.expoConfig?.version ?? null;
  const storeUrl = Platform.OS === "ios" ? data?.ios?.url : data?.android?.url;
  const storeUpdate = Boolean(
    installed && data?.latest && storeUrl && compareVersions(installed, data.latest) < 0,
  );

  const mode: "ota" | "store" | null = isUpdatePending ? "ota" : storeUpdate ? "store" : null;
  if (!mode || dismissed) return null;

  const label = mode === "ota" ? "Update ready — tap to refresh" : "A new version is available — update now";

  const onApply = () => {
    if (mode === "ota") {
      void Updates.reloadAsync();
    } else if (storeUrl) {
      void Linking.openURL(storeUrl);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(220)} style={{ backgroundColor: colors.surfaceHigh }}>
      <View style={{ height: insets.top, backgroundColor: colors.surfaceHigh }} />
      <Pressable
        onPress={onApply}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          paddingHorizontal: 16,
          paddingVertical: 11,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
          backgroundColor: pressed ? colors.surfaceHigher : colors.surfaceHigh,
        })}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.limeGlow,
          }}
        >
          <ArrowUp size={15} color={colors.lime} />
        </View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 13.5, fontFamily: fonts.labelBold, color: colors.textPrimary }}
        >
          {label}
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => setDismissed(true)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss update notice"
          style={{ padding: 2 }}
        >
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
