import React, { useRef, useState, useMemo, useCallback } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Share,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import { RotateCcw, Share2, X, Users } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";
import {
  formatDistanceKm,
  calculatePaceAndSpeed,
} from "@/lib/tracking/runUtils";
import { useAppSelector } from "@/store/hooks";
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";
import { createSocialPost } from "@/services/tracking/socialService";

const { height: SH } = Dimensions.get("window");

type Coord = { latitude: number; longitude: number };
type Phase = "camera" | "preview";

interface RunShareCardProps {
  visible: boolean;
  distanceMeters: number;
  elapsedSeconds: number;
  coordinates: Coord[];
  onClose: () => void;
}

// ── route helpers ──────────────────────────────────────────────
function thinCoords(coords: Coord[], max = 120): Coord[] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out: Coord[] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]!);
  const last = coords[coords.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

type Pt = { x: number; y: number };

function projectCoords(coords: Coord[], w: number, h: number, pad = 10): Pt[] {
  if (coords.length < 2) return [];
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rLat = maxLat - minLat || 0.0001;
  const rLng = maxLng - minLng || 0.0001;
  const dw = w - pad * 2, dh = h - pad * 2;
  return coords.map((c) => ({
    x: pad + ((c.longitude - minLng) / rLng) * dw,
    y: pad + ((maxLat - c.latitude) / rLat) * dh,
  }));
}

const ROUTE_W = 160;
const ROUTE_H = 100;
const GREEN = "#34C759";

/**
 * Pure React Native polyline — renders each segment as a rotated View.
 * SVG is skipped intentionally: react-native-view-shot on Android sometimes
 * fails to capture SVG elements, producing a blank route in the shared image.
 */
function RouteLines({ pts, color, width: sw }: { pts: Pt[]; color: string; width: number }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width: ROUTE_W, height: ROUTE_H }}>
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
    </View>
  );
}

// ── stat helpers ───────────────────────────────────────────────
function formatTimeDisplay(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  if (hrs > 0) return `${hrs}h ${m}m`;
  if (m > 0 && secs > 0) return `${m}m ${secs}s`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

export function RunShareCard({
  visible,
  distanceMeters,
  elapsedSeconds,
  coordinates,
  onClose,
}: RunShareCardProps) {
  const insets = useSafeAreaInsets();

  // Team membership
  const token = useAppSelector((s) => s.user.token);
  const appRole = useAppSelector((s) => s.user.appRole);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const isTeamMember = useMemo(
    () => shouldUseTeamTrackingFeatures({ appRole, authTeamMembership, firstManagedAthlete: managedAthletes[0] ?? null }),
    [appRole, authTeamMembership, managedAthletes],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null);
  // ref on the preview view — captureRef() screenshots it with stats baked in
  const previewRef = useRef<View>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [teamPosted, setTeamPosted] = useState(false);

  const scaleShutter = useSharedValue(1);
  const scaleShare = useSharedValue(1);

  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleShutter.value }],
  }));
  const shareStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleShare.value }],
  }));

  const distLabel = formatDistanceKm(distanceMeters, 2);
  const timeLabel = formatTimeDisplay(elapsedSeconds);
  const { paceMinPerKm } = calculatePaceAndSpeed(distanceMeters, elapsedSeconds);

  const routePts = useMemo(
    () => projectCoords(thinCoords(coordinates), ROUTE_W, ROUTE_H),
    [coordinates],
  );

  const handleCapture = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCapturing(true);
    try {
      // CameraView class instance exposes takePictureAsync (not takePicture)
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92, skipProcessing: false });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setPhase("preview");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn("[RunShareCard] capture failed:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const handleRetake = () => {
    Haptics.selectionAsync();
    setPhotoUri(null);
    setPhase("camera");
  };

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Post to team feed silently
    if (isTeamMember && token && !teamPosted) {
      createSocialPost(token, { content: `🏃 ${distLabel} km in ${timeLabel} at ${paceMinPerKm}/km` }, { useTeamFeed: true }).catch(() => {});
      setTeamPosted(true);
    }

    try {
      // Capture the preview view (photo + stats overlay + branding) as a single image
      // so the shared file already has everything baked in.
      const compositeUri = previewRef.current
        ? await captureRef(previewRef, { format: "jpg", quality: 0.92 })
        : photoUri;

      if (!compositeUri) {
        await Share.share({ message: `🏃 ${distLabel} km · ${paceMinPerKm}/km · ${timeLabel}\n\nPH Performance` }).catch(() => {});
        return;
      }

      if (Platform.OS === "ios") {
        await Share.share({ url: compositeUri }).catch(() => {});
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(compositeUri).catch(() => {});
        } else {
          await Share.share({ message: `🏃 ${distLabel} km · ${paceMinPerKm}/km · ${timeLabel}\n\nPH Performance` }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("[RunShareCard] share failed:", e);
    } finally {
      setSharing(false);
    }
  }, [sharing, photoUri, isTeamMember, token, teamPosted, distLabel, timeLabel, paceMinPerKm]);

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  // ── stats + route overlay (reused in both phases) ──────────────
  const StatsOverlay = (
    <>
      {/* Floating stats */}
      <View style={styles.statsWrap}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Distance</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statNumber}>{distLabel}</Text>
            <Text style={styles.statUnit}> km</Text>
          </View>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Pace</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statNumber}>{paceMinPerKm}</Text>
            <Text style={styles.statUnit}> /km</Text>
          </View>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Time</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statNumber}>{timeLabel}</Text>
          </View>
        </View>
      </View>

      {/* Branding — anchored at fixed bottom so route never overlaps it */}
      <View style={styles.brandWrap}>
        <Text style={styles.brandName}>PH PERFORMANCE</Text>
      </View>

      {/* Route path — above brand, pure RN Views, always captured on Android + iOS */}
      {routePts.length > 1 && (
        <View style={styles.routeWrap}>
          {/* glow layer */}
          <RouteLines pts={routePts} color={`${GREEN}38`} width={7} />
          {/* solid line */}
          <RouteLines pts={routePts} color={GREEN} width={2.5} />
        </View>
      )}
    </>
  );

  if (!visible) return null;

  // ── permission gate ────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
        <View style={[styles.root, { justifyContent: "center", alignItems: "center", gap: 20, paddingHorizontal: 32 }]}>
          <Text style={{ color: "#fff", fontSize: 18, fontFamily: fonts.accentBold, textAlign: "center" }}>
            Camera Access
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: fonts.bodyMedium, textAlign: "center" }}>
            Allow camera access to capture your run moment
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{ backgroundColor: GREEN, paddingHorizontal: 32, paddingVertical: 14, borderRadius: radius.xxl }}
          >
            <Text style={{ color: "#000", fontFamily: fonts.accentBold, fontSize: 16 }}>Allow Camera</Text>
          </Pressable>
          <Pressable onPress={handleClose}>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: fonts.bodyMedium, fontSize: 15 }}>Skip</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.root}>

        {phase === "camera" ? (
          /* ── Camera phase: live viewfinder + overlay (not captured) ── */
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={facing}
            />
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />
            {StatsOverlay}
          </>
        ) : (
          /* ── Preview phase: captured view with stats baked in ── */
          /* collapsable={false} ensures Android doesn't optimise the view away for captureRef */
          <View
            ref={previewRef}
            collapsable={false}
            style={StyleSheet.absoluteFillObject}
          >
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />
            {StatsOverlay}
          </View>
        )}

        {/* ── Close button (always on top, outside capturable view) ── */}
        <Pressable
          onPress={handleClose}
          style={[styles.closeBtn, { top: insets.top + 16 }]}
          hitSlop={12}
        >
          <X size={22} color="#fff" strokeWidth={2.5} />
        </Pressable>

        {/* ── Flip camera (camera phase only) ── */}
        {phase === "camera" && (
          <Pressable
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            style={[styles.flipBtn, { top: insets.top + 16 }]}
            hitSlop={12}
          >
            <RotateCcw size={22} color="#fff" strokeWidth={2.5} />
          </Pressable>
        )}

        {/* ── Bottom controls (always outside capturable view) ── */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
          {phase === "camera" ? (
            <>
              <Animated.View style={shutterStyle}>
                <Pressable
                  onPress={handleCapture}
                  onPressIn={() => (scaleShutter.value = withSpring(0.92, { damping: 15, stiffness: 300 }))}
                  onPressOut={() => (scaleShutter.value = withSpring(1, { damping: 15, stiffness: 300 }))}
                  disabled={capturing}
                  style={[styles.shutterOuter, capturing && { opacity: 0.6 }]}
                >
                  <View style={styles.shutterInner} />
                </Pressable>
              </Animated.View>
              <Pressable onPress={handleClose} style={{ marginTop: 16 }}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </>
          ) : (
            /* ── Preview: share + retake ── */
            <>
              <Animated.View style={[shareStyle, styles.shareWrap]}>
                <Pressable
                  onPress={handleShare}
                  onPressIn={() => (scaleShare.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
                  onPressOut={() => (scaleShare.value = withSpring(1, { damping: 15, stiffness: 300 }))}
                  disabled={sharing}
                  style={[styles.shareBtn, sharing && { opacity: 0.7 }]}
                >
                  <Share2 size={20} color="#0a0a0a" strokeWidth={2.5} />
                  <Text style={styles.shareBtnText}>{sharing ? "Preparing…" : "Share"}</Text>
                  {isTeamMember && !teamPosted && (
                    <View style={styles.teamBadge}>
                      <Users size={11} color="#fff" strokeWidth={2.5} />
                    </View>
                  )}
                </Pressable>
              </Animated.View>

              {isTeamMember && (
                <View style={styles.teamHint}>
                  <Users size={12} color={GREEN} strokeWidth={2.5} />
                  <Text style={styles.teamHintText}>
                    {teamPosted ? "Posted to team feed ✓" : "Also posts to your team feed"}
                  </Text>
                </View>
              )}

              <Pressable onPress={handleRetake} style={styles.retakeRow} disabled={sharing}>
                <RotateCcw size={14} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                <Text style={styles.retakeText}>Retake photo</Text>
              </Pressable>
            </>
          )}
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SH * 0.65,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.35,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  statsWrap: {
    position: "absolute",
    top: SH * 0.12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  statBlock: {
    alignItems: "center",
    marginBottom: 2,
  },
  statLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: fonts.accentBold,       // Outfit-Bold — bold label
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  statNumber: {
    color: "#fafafa",
    fontSize: 60,
    fontFamily: fonts.heroNumber,        // Outfit-Black — heaviest weight
    letterSpacing: -2,
    lineHeight: 64,
    fontVariant: ["tabular-nums"] as any,
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  statUnit: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 20,
    fontFamily: fonts.accentBold,        // Outfit-Bold — bold unit
    marginBottom: 9,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  routeWrap: {
    position: "absolute",
    left: 24,
    bottom: 112,
    width: ROUTE_W,
    height: ROUTE_H,
    overflow: "hidden",
  },
  brandWrap: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  brandName: {
    color: "#fafafa",
    fontSize: 22,
    fontFamily: fonts.heroDisplay,       // Outfit-ExtraBold — maximum brand weight
    letterSpacing: 4,
    textShadowColor: "rgba(0,0,0,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  closeBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtn: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  shareWrap: {
    width: "100%",
    paddingHorizontal: 24,
  },
  shareBtn: {
    height: 56,
    backgroundColor: GREEN,
    borderRadius: radius.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtnText: {
    color: "#0a0a0a",
    fontFamily: fonts.accentBold,
    fontSize: 16,
  },
  skipText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  teamBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  teamHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  teamHintText: {
    color: GREEN,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  retakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  retakeText: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
