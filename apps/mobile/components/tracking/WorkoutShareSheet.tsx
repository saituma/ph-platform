import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { Image } from "expo-image";
import MapView, { Polyline } from "react-native-maps";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Share2, X } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { formatDurationClock } from "@/lib/tracking/runUtils";

const { width: SW, height: SH } = Dimensions.get("window");

const CARD_W = SW - 56;
const CARD_H = Math.min(Math.round(CARD_W * 1.45), Math.round(SH * 0.54));
const GREEN = "#2F9F3D";

type CardStyle = "power" | "minimal" | "map";
const CARD_STYLES: CardStyle[] = ["power", "minimal", "map"];
const STYLE_LABELS: Record<CardStyle, string> = {
  power: "Power",
  minimal: "Minimal",
  map: "Map",
};

// ── Route helpers ──────────────────────────────────────────────────────────

type Coord = { latitude: number; longitude: number };
type Pt = { x: number; y: number };

function thinCoords(coords: Coord[], max = 100): Coord[] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out: Coord[] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]!);
  const last = coords[coords.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function projectCoords(coords: Coord[], w: number, h: number, pad = 24): Pt[] {
  if (coords.length < 2) return [];
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rLat = maxLat - minLat || 0.0001;
  const rLng = maxLng - minLng || 0.0001;
  const dw = w - pad * 2;
  const dh = h - pad * 2;
  return coords.map((c) => ({
    x: pad + ((c.longitude - minLng) / rLng) * dw,
    y: pad + ((maxLat - c.latitude) / rLat) * dh,
  }));
}

// Pure View-based polyline — safe for react-native-view-shot on Android
function RouteLines({ pts, color, sw }: { pts: Pt[]; color: string; sw: number }) {
  return (
    <>
      {pts.slice(0, -1).map((a, i) => {
        const b = pts[i + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.5) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: cx - len / 2,
              top: cy - sw / 2,
              width: len,
              height: sw,
              backgroundColor: color,
              borderRadius: sw / 2,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
    </>
  );
}

// ── Stat helpers ───────────────────────────────────────────────────────────

function computePace(meters: number, seconds: number): string {
  const km = meters / 1000;
  if (km <= 0 || seconds <= 0) return "--:--";
  const secPerKm = seconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function capitalizeSport(sport: string | null | undefined): string {
  if (!sport) return "Run";
  return sport.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Card Components ────────────────────────────────────────────────────────

function PowerCard({
  cardRef,
  distKm,
  paceStr,
  timeStr,
  sport,
  routePts,
}: {
  cardRef: React.RefObject<View | null>;
  distKm: string;
  paceStr: string;
  timeStr: string;
  sport: string;
  routePts: Pt[];
}) {
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: CARD_W,
        height: CARD_H,
        backgroundColor: "#070f0b",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {/* Route watermark — full card, very faint */}
      {routePts.length > 1 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            opacity: 0.13,
          }}
        >
          <RouteLines pts={routePts} color={GREEN} sw={7} />
        </View>
      )}

      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: GREEN }} />

      <View style={{ flex: 1, padding: 26, justifyContent: "space-between" }}>
        {/* Brand + sport */}
        <View style={{ gap: 3 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 9,
              letterSpacing: 2.8,
              color: GREEN,
              textTransform: "uppercase",
            }}
          >
            PH PERFORMANCE
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.32)",
              textTransform: "capitalize",
            }}
          >
            {sport}
          </Text>
        </View>

        {/* Big distance */}
        <View>
          <Text
            style={{
              fontFamily: "Outfit-Black",
              fontSize: 84,
              lineHeight: 88,
              color: "#fff",
              letterSpacing: -4,
            }}
          >
            {distKm}
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 20,
              color: "rgba(255,255,255,0.38)",
              marginTop: -4,
            }}
          >
            km
          </Text>
        </View>

        {/* Stats row */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.09)",
            paddingTop: 16,
            flexDirection: "row",
            gap: 28,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 9,
                letterSpacing: 1.5,
                color: "rgba(255,255,255,0.32)",
                textTransform: "uppercase",
              }}
            >
              Pace
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 19, color: "#fff" }}>
                {paceStr}
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.32)",
                }}
              >
                {" /km"}
              </Text>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 9,
                letterSpacing: 1.5,
                color: "rgba(255,255,255,0.32)",
                textTransform: "uppercase",
              }}
            >
              Time
            </Text>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 19, color: "#fff" }}>
              {timeStr}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function MinimalCard({
  cardRef,
  distKm,
  paceStr,
  timeStr,
}: {
  cardRef: React.RefObject<View | null>;
  distKm: string;
  paceStr: string;
  timeStr: string;
}) {
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: CARD_W,
        height: CARD_H,
        backgroundColor: "#000",
        borderRadius: 24,
        overflow: "hidden",
        padding: 28,
      }}
    >
      {/* Brand */}
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 9,
          letterSpacing: 2.8,
          color: "rgba(255,255,255,0.28)",
          textTransform: "uppercase",
        }}
      >
        PH PERFORMANCE
      </Text>

      {/* Big distance — vertically centered */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: "Outfit-Black",
            fontSize: 92,
            lineHeight: 96,
            color: "#fff",
            letterSpacing: -5,
          }}
        >
          {distKm}
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-Medium",
            fontSize: 26,
            color: "rgba(255,255,255,0.28)",
            marginTop: -8,
          }}
        >
          km
        </Text>
      </View>

      {/* Separator */}
      <View
        style={{
          height: 1,
          backgroundColor: "rgba(255,255,255,0.14)",
          marginBottom: 18,
        }}
      />

      {/* Stats */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ gap: 3 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 9,
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.28)",
              textTransform: "uppercase",
            }}
          >
            Pace
          </Text>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: "#fff" }}>
            {paceStr}
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
              {" /km"}
            </Text>
          </Text>
        </View>
        <View style={{ gap: 3, alignItems: "flex-end" }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 9,
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.28)",
              textTransform: "uppercase",
            }}
          >
            Time
          </Text>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: "#fff" }}>
            {timeStr}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MapCard({
  cardRef,
  distKm,
  paceStr,
  timeStr,
  sport,
  mapSnapshotUri,
  mapLoading,
}: {
  cardRef: React.RefObject<View | null>;
  distKm: string;
  paceStr: string;
  timeStr: string;
  sport: string;
  mapSnapshotUri: string | null;
  mapLoading: boolean;
}) {
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: CARD_W,
        height: CARD_H,
        backgroundColor: "#0a0a0a",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {/* Map bg */}
      {mapSnapshotUri ? (
        <Image
          source={{ uri: mapSnapshotUri }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mapLoading && <ActivityIndicator color={GREEN} />}
        </View>
      )}

      {/* Gradient overlays */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.22)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: CARD_H * 0.52,
          backgroundColor: "rgba(0,0,0,0.7)",
        }}
      />

      {/* Content */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 24,
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 9,
            letterSpacing: 2.8,
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          PH PERFORMANCE
        </Text>

        <View style={{ gap: 16 }}>
          <View>
            <Text
              style={{
                fontFamily: "Outfit-Black",
                fontSize: 78,
                lineHeight: 82,
                color: "#fff",
                letterSpacing: -3.5,
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              {distKm}
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 18,
                color: "rgba(255,255,255,0.48)",
                marginTop: -4,
              }}
            >
              km · {sport.toLowerCase()}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={{ gap: 3 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.38)",
                  textTransform: "uppercase",
                }}
              >
                Pace
              </Text>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: "#fff" }}>
                {paceStr}/km
              </Text>
            </View>
            <View style={{ gap: 3 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 9,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.38)",
                  textTransform: "uppercase",
                }}
              >
                Time
              </Text>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: "#fff" }}>
                {timeStr}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── WorkoutShareSheet ──────────────────────────────────────────────────────

export interface WorkoutShareSheetProps {
  visible: boolean;
  distanceMeters: number;
  elapsedSeconds: number;
  coordinates: Coord[];
  sport?: string | null;
  onClose: () => void;
}

export function WorkoutShareSheet({
  visible,
  distanceMeters,
  elapsedSeconds,
  coordinates,
  sport,
  onClose,
}: WorkoutShareSheetProps) {
  const insets = useSafeAreaInsets();
  const [activeStyle, setActiveStyle] = useState<CardStyle>("power");
  const [sharing, setSharing] = useState(false);
  const [mapSnapshotUri, setMapSnapshotUri] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const powerRef = useRef<View>(null);
  const minimalRef = useRef<View>(null);
  const mapCardRef = useRef<View>(null);
  const hiddenMapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setActiveStyle("power");
      setSharing(false);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  const distKm = useMemo(() => (distanceMeters / 1000).toFixed(2), [distanceMeters]);
  const paceStr = useMemo(
    () => computePace(distanceMeters, elapsedSeconds),
    [distanceMeters, elapsedSeconds],
  );
  const timeStr = useMemo(() => formatDurationClock(elapsedSeconds), [elapsedSeconds]);
  const sportLabel = useMemo(() => capitalizeSport(sport), [sport]);

  const routeRegion = useMemo(() => {
    if (coordinates.length < 2) return null;
    const lats = coordinates.map((c) => c.latitude);
    const lngs = coordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.004, maxLat - minLat + 0.0015),
      longitudeDelta: Math.max(0.004, maxLng - minLng + 0.0015),
    };
  }, [coordinates]);

  const routePts = useMemo(
    () => projectCoords(thinCoords(coordinates), CARD_W, CARD_H),
    [coordinates],
  );

  const handleHiddenMapReady = useCallback(() => {
    if (mapSnapshotUri || !routeRegion) return;
    setMapLoading(true);
    setTimeout(async () => {
      try {
        const uri = await hiddenMapRef.current?.takeSnapshot({
          format: "jpg",
          quality: 0.92,
          result: "file",
        });
        if (uri) setMapSnapshotUri(uri);
      } catch {
        // ignore
      } finally {
        setMapLoading(false);
      }
    }, 1800);
  }, [mapSnapshotUri, routeRegion]);

  const activeRef = useMemo(() => {
    if (activeStyle === "minimal") return minimalRef;
    if (activeStyle === "map") return mapCardRef;
    return powerRef;
  }, [activeStyle]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSharing(true);
    try {
      const uri = await captureRef(activeRef, { format: "png", quality: 1 });
      if (Platform.OS === "ios") {
        await Share.share({ url: uri }).catch(() => {});
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your workout",
          });
        } else {
          await Share.share({
            message: `${distKm} km · ${paceStr}/km · ${timeStr} — PH Performance`,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[WorkoutShareSheet] share failed:", e);
    } finally {
      setSharing(false);
    }
  }, [sharing, activeRef, distKm, paceStr, timeStr]);

  const handleStylePress = useCallback(
    (style: CardStyle, index: number) => {
      Haptics.selectionAsync();
      setActiveStyle(style);
      scrollRef.current?.scrollTo({ x: index * SW, animated: true });
    },
    [],
  );

  const handleClose = useCallback(() => {
    Haptics.selectionAsync();
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#090909" }}>

        {/* Hidden off-screen MapView for snapshot */}
        {routeRegion && !mapSnapshotUri && (
          <MapView
            ref={hiddenMapRef}
            style={{
              position: "absolute",
              width: CARD_W,
              height: CARD_H,
              left: -(CARD_W + 200),
              top: 0,
            }}
            initialRegion={routeRegion}
            mapType="standard"
            onMapReady={handleHiddenMapReady}
            pitchEnabled={false}
            rotateEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            toolbarEnabled={false}
            showsCompass={false}
            showsUserLocation={false}
          >
            {coordinates.length > 1 && (
              <Polyline
                coordinates={coordinates}
                strokeColor={GREEN}
                strokeWidth={4}
              />
            )}
          </MapView>
        )}

        {/* Close */}
        <Pressable
          onPress={handleClose}
          hitSlop={10}
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 20,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} color="#fff" strokeWidth={2.5} />
        </Pressable>

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            alignItems: "center",
            gap: 3,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: "#fff", letterSpacing: -0.3 }}
          >
            Share Workout
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Swipe to choose a style
          </Text>
        </View>

        {/* Card Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={{ height: CARD_H, flexGrow: 0 }}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SW);
            const s = CARD_STYLES[page];
            if (s) setActiveStyle(s);
          }}
        >
          <View style={{ width: SW, height: CARD_H, alignItems: "center", justifyContent: "center" }}>
            <PowerCard
              cardRef={powerRef}
              distKm={distKm}
              paceStr={paceStr}
              timeStr={timeStr}
              sport={sportLabel}
              routePts={routePts}
            />
          </View>

          <View style={{ width: SW, height: CARD_H, alignItems: "center", justifyContent: "center" }}>
            <MinimalCard
              cardRef={minimalRef}
              distKm={distKm}
              paceStr={paceStr}
              timeStr={timeStr}
            />
          </View>

          <View style={{ width: SW, height: CARD_H, alignItems: "center", justifyContent: "center" }}>
            <MapCard
              cardRef={mapCardRef}
              distKm={distKm}
              paceStr={paceStr}
              timeStr={timeStr}
              sport={sportLabel}
              mapSnapshotUri={mapSnapshotUri}
              mapLoading={mapLoading}
            />
          </View>
        </ScrollView>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Style pills */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginBottom: 18,
          }}
        >
          {CARD_STYLES.map((style, i) => {
            const isActive = style === activeStyle;
            return (
              <Pressable
                key={style}
                onPress={() => handleStylePress(style, i)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 9,
                  borderRadius: 100,
                  backgroundColor: isActive ? GREEN : "rgba(255,255,255,0.09)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    fontSize: 13,
                    color: isActive ? "#000" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {STYLE_LABELS[style]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Share button */}
        <Pressable
          onPressIn={() => {
            btnScale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            btnScale.value = withSpring(1, { damping: 20, stiffness: 300 });
          }}
          onPress={handleShare}
          disabled={sharing}
          style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }}
        >
          <Animated.View
            style={[
              btnStyle,
              {
                height: 56,
                backgroundColor: GREEN,
                borderRadius: 100,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: sharing ? 0.7 : 1,
              },
            ]}
          >
            <Share2 size={18} color="#000" strokeWidth={2.5} />
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: "#000" }}>
              {sharing ? "Sharing…" : "Share Image"}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}
