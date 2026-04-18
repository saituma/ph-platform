import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { radius, spacing } from "@/constants/theme";
import { fetchRunDetail } from "@/services/tracking/socialService";
import { TrackingMapView } from "@/components/tracking/TrackingMapView";
import { MapStyleSwitcher } from "@/components/tracking/MapStyleSwitcher";
import type { TrackingMapLayer, TrackingMapStyle } from "@/components/tracking/trackingMapLayers";
import { formatDistanceKm, formatDurationClock } from "@/lib/tracking/runUtils";

type LatLng = { latitude: number; longitude: number };

export default function RunPathScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const token = useAppSelector((s) => s.user.token);
  const params = useLocalSearchParams<{ runLogId?: string }>();

  const runLogId = useMemo(() => {
    const n = Number(params.runLogId);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }, [params.runLogId]);

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<{
    runLogId: number;
    userId: number;
    name: string;
    avatarUrl: string | null;
    date: string;
    distanceMeters: number;
    durationSeconds: number;
    avgPace: number | null;
    path: LatLng[] | null;
  } | null>(null);
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");

  useEffect(() => {
    if (!token) return;
    if (runLogId == null) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetchRunDetail(token, runLogId);
        if (!alive) return;
        setItem(res.item ?? null);
      } catch (e: any) {
        if (!alive) return;
        Alert.alert("Couldn't load run", String(e?.message ?? "Error"));
        setItem(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [runLogId, token]);

  const points = item?.path ?? null;

  const layers = useMemo((): TrackingMapLayer[] => {
    if (!points || points.length < 2) return [];
    const pts = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    return [
      {
        id: "route",
        type: "polyline",
        coordinates: pts,
        strokeColor: colors.mapRoute,
        strokeWidth: 4,
      },
      {
        id: "start",
        type: "marker",
        coordinate: pts[0]!,
        title: "Start",
        marker: {
          kind: "circle",
          color: colors.mapStart,
          borderColor: "#fff",
          borderWidth: 2,
          size: 9,
        },
      },
      {
        id: "end",
        type: "marker",
        coordinate: pts[pts.length - 1]!,
        title: "End",
        marker: {
          kind: "circle",
          color: colors.mapEnd,
          borderColor: "#fff",
          borderWidth: 2,
          size: 9,
        },
      },
    ];
  }, [colors, points]);

  const initialRegion = useMemo(() => {
    if (!points || points.length === 0) return undefined;
    return {
      latitude: points[0]!.latitude,
      longitude: points[0]!.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }, [points]);

  const onShare = async () => {
    if (!item) return;
    const km = formatDistanceKm(item.distanceMeters, 2);
    const time = formatDurationClock(item.durationSeconds ?? 0);
    await Share.share({ message: `${item.name} ran ${km} km in ${time}.` }).catch(() => {});
  };

  if (!token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: spacing.xl }}>
          <Text className="text-base font-outfit" style={{ color: colors.textSecondary }}>
            Sign in to view run paths.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (runLogId == null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: spacing.xl }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="chevron-left" size={18} color={colors.icon} />
            <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textSecondary }}>
              Back
            </Text>
          </Pressable>
          <Text className="text-base font-outfit mt-4" style={{ color: colors.textSecondary }}>
            Invalid run.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              height: 40,
              paddingHorizontal: 10,
              borderRadius: radius.pill,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Feather name="chevron-left" size={18} color={colors.icon} />
            <Text className="text-sm font-outfit font-semibold" style={{ color: colors.textSecondary }}>
              Back
            </Text>
          </Pressable>

          <Text className="text-sm font-clash font-semibold" style={{ color: colors.text }}>
            Run path
          </Text>

          <Pressable
            onPress={onShare}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Feather name="share-2" size={18} color={colors.icon} />
          </Pressable>
        </View>

        {item ? (
          <Text className="text-xs font-outfit mt-2" style={{ color: colors.textSecondary }}>
            {item.name} · {new Date(item.date).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : !points || points.length < 2 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl }}>
            <Text className="text-base font-outfit" style={{ color: colors.textSecondary, textAlign: "center" }}>
              No route recorded for this run.
            </Text>
          </View>
        ) : (
          <>
            <TrackingMapView
              style={{ flex: 1 }}
              mapStyle={mapStyle}
              initialRegion={initialRegion}
              layers={layers}
            />
            <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} colors={colors} left={14} anchorBottom={14} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
