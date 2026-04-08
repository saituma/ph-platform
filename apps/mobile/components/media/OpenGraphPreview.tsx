import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import React from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@/components/ui/theme-icons";

type OpenGraphData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

function getDisplayHost(rawUrl: string) {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

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
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
    "loading",
  );

  React.useEffect(() => {
    let active = true;
    setStatus("loading");
    (async () => {
      try {
        const res = await apiRequest<{ data?: OpenGraphData }>(
          `/open-graph?url=${encodeURIComponent(url)}`,
          { token, suppressStatusCodes: [400, 401, 403, 404] },
        );
        if (!active) return;
        setData(res?.data ?? null);
        setStatus(res?.data ? "loaded" : "error");
      } catch {
        if (!active) return;
        setData(null);
        setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [token, url]);

  const resolvedUrl = data?.url || url;
  const host = getDisplayHost(resolvedUrl);

  if (!data) {
    if (status !== "loading") return null;
    return (
      <View
        className={`${compact ? "mt-2" : "mt-3"} overflow-hidden rounded-[18px] border`}
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.borderSubtle,
        }}
      >
        <View className={compact ? "flex-row p-3 items-center gap-3" : "p-4"}>
          <View
            style={{
              width: compact ? 56 : "100%",
              height: compact ? 56 : 140,
              borderRadius: 14,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,23,42,0.06)",
            }}
          />
          <View className={compact ? "flex-1 gap-2" : "mt-3 gap-2"}>
            <View
              style={{
                height: 12,
                width: "55%",
                borderRadius: 999,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.06)",
              }}
            />
            <View
              style={{
                height: 14,
                width: "85%",
                borderRadius: 999,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.06)",
              }}
            />
            <View
              style={{
                height: 12,
                width: "70%",
                borderRadius: 999,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.06)",
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  const title = (data.title ?? "").trim();
  const description = (data.description ?? "").trim();
  const siteName = (data.siteName ?? "").trim();
  const image = data.image ?? null;

  if (!title && !description && !image) return null;

  const label = siteName || host;

  if (compact) {
    return (
      <Pressable
        onPress={() => Linking.openURL(resolvedUrl)}
        className="mt-2 overflow-hidden rounded-[18px] border"
        style={{
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.borderSubtle,
        }}
      >
        <View className="flex-row items-center gap-3 p-3">
          <View
            className="overflow-hidden rounded-[14px]"
            style={{
              width: 56,
              height: 56,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            {image ? (
              <>
                <ExpoImage
                  source={{ uri: image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.35)"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 26,
                  }}
                />
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Feather name="link" size={18} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View className="flex-1">
            <Text
              className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
              style={{ color: colors.textSecondary }}
              numberOfLines={1}
            >
              {label}
            </Text>
            {title ? (
              <Text
                className="mt-1 text-sm font-outfit font-semibold"
                style={{ color: colors.text }}
                numberOfLines={2}
              >
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text
                className="mt-1 text-[12px] font-outfit leading-5"
                style={{ color: colors.textSecondary }}
                numberOfLines={2}
              >
                {description}
              </Text>
            ) : null}
          </View>

          <View
            className="h-10 w-10 rounded-2xl items-center justify-center border"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(15,23,42,0.06)",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(255,255,255,0.7)",
            }}
          >
            <Feather name="arrow-up-right" size={16} color={colors.accent} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => Linking.openURL(resolvedUrl)}
      className="mt-3 overflow-hidden rounded-[20px] border"
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderColor: colors.borderSubtle,
      }}
    >
      {image ? (
        <View className="overflow-hidden">
          <ExpoImage
            source={{ uri: image }}
            style={{ width: "100%", height: 180 }}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.55)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 80,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 14,
            }}
          >
            <Text
              className="text-[11px] font-outfit font-bold uppercase tracking-[1.4px]"
              style={{ color: "rgba(255,255,255,0.85)" }}
              numberOfLines={1}
            >
              {label}
            </Text>
            {title ? (
              <Text
                className="mt-1 text-lg font-clash font-bold"
                style={{ color: "#fff" }}
                numberOfLines={2}
              >
                {title}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View className="px-5 py-5">
        {!image && label ? (
          <Text
            className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
            style={{ color: colors.textSecondary }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ) : null}

        {!image && title ? (
          <Text
            className="mt-1 text-base font-outfit font-semibold"
            style={{ color: colors.text }}
            numberOfLines={2}
          >
            {title}
          </Text>
        ) : null}

        {description ? (
          <Text
            className={`${image ? "mt-0" : "mt-2"} text-[13px] font-outfit leading-6`}
            style={{ color: colors.textSecondary }}
            numberOfLines={3}
          >
            {description}
          </Text>
        ) : null}

        <View
          className="mt-4 flex-row items-center justify-between rounded-2xl border px-4 py-3"
          style={{
            borderColor: isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(15,23,42,0.06)",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.7)",
          }}
        >
          <Text
            className="text-[12px] font-outfit font-semibold"
            style={{ color: colors.text }}
            numberOfLines={1}
          >
            {host}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text
              className="text-[12px] font-outfit font-bold"
              style={{ color: colors.accent }}
            >
              Open
            </Text>
            <Feather
              name="arrow-up-right"
              size={16}
              color={colors.accent}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
