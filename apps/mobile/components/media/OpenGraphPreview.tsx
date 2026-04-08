import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import React from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Image as ExpoImage } from "expo-image";

type OpenGraphData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

export function OpenGraphPreview({
  url,
  token,
  compact = false,
}: {
  url: string;
  token: string;
  compact?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const [data, setData] = React.useState<OpenGraphData | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<{ data?: OpenGraphData }>(
          `/open-graph?url=${encodeURIComponent(url)}`,
          { token, suppressStatusCodes: [400, 401, 403, 404] },
        );
        if (!active) return;
        setData(res?.data ?? null);
      } catch {
        if (!active) return;
        setData(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, url]);

  if (!data) return null;

  const title = (data.title ?? "").trim();
  const description = (data.description ?? "").trim();
  const siteName = (data.siteName ?? "").trim();
  const image = data.image ?? null;

  if (!title && !description && !image) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(data.url || url)}
      className="mt-3 overflow-hidden rounded-[18px] border"
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderColor: colors.borderSubtle,
      }}
    >
      {image ? (
        <ExpoImage
          source={{ uri: image }}
          style={{ width: "100%", height: compact ? 120 : 160 }}
          contentFit="cover"
        />
      ) : null}
      <View className={compact ? "px-3 py-3" : "px-4 py-4"}>
        {siteName ? (
          <Text
            className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
            style={{ color: colors.textSecondary }}
            numberOfLines={1}
          >
            {siteName}
          </Text>
        ) : null}
        {title ? (
          <Text
            className={
              compact
                ? "mt-1 text-sm font-outfit font-semibold"
                : "mt-1 text-base font-outfit font-semibold"
            }
            style={{ color: colors.text }}
            numberOfLines={2}
          >
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text
            className={
              compact
                ? "mt-1 text-[12px] font-outfit leading-5"
                : "mt-2 text-[13px] font-outfit leading-5"
            }
            style={{ color: colors.textSecondary }}
            numberOfLines={compact ? 2 : 3}
          >
            {description}
          </Text>
        ) : null}
        <View
          className="mt-3 h-[1px]"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
          }}
        />
        <Text
          className="mt-2 text-[11px] font-outfit font-semibold"
          style={{ color: colors.accent }}
          numberOfLines={1}
        >
          Open link
        </Text>
      </View>
    </Pressable>
  );
}
