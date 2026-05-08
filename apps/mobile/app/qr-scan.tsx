import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text as RNText,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, CheckCircle, AlertCircle, ScanLine, Camera } from "lucide-react-native";
import Animated, { FadeIn, FadeInUp, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { useAppSelector } from "@/store/hooks";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.7;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 12;

type ScanState = "idle" | "scanning" | "success" | "error";

interface ScanResult {
  sessionName?: string;
  message?: string;
}

export default function QRScanScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const token = useAppSelector((s) => s.auth?.accessToken ?? null);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const hasScanned = useRef(false);

  // Auto-navigate back on success after 2s
  useEffect(() => {
    if (scanState === "success") {
      const timer = setTimeout(() => {
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [scanState, router]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (hasScanned.current || scanState === "scanning") return;
      hasScanned.current = true;
      setScanState("scanning");

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { apiRequest } = await import("@/lib/api");
        const response = await apiRequest<{
          success: boolean;
          sessionName?: string;
          message?: string;
        }>("/sessions/attendance/qr/scan", {
          method: "POST",
          body: { token: data },
          token,
        });

        setScanState("success");
        setResult({
          sessionName: response.sessionName,
          message: response.message,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        setScanState("error");
        const msg =
          err?.message ||
          err?.data?.message ||
          "Could not check in. Please try again.";
        setErrorMessage(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [scanState, token],
  );

  const handleRetry = useCallback(() => {
    hasScanned.current = false;
    setScanState("idle");
    setResult(null);
    setErrorMessage("");
  }, []);

  // ── Permission not yet determined ──
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: p.pageBg }]}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color={p.textPrimary} />
        </Pressable>
        <View style={styles.permissionContainer}>
          <Camera size={64} color={p.textSecondary} strokeWidth={1.2} />
          <Text
            style={[
              styles.permissionTitle,
              { color: p.textPrimary, fontFamily: "Outfit-Bold" },
            ]}
          >
            Camera Access Required
          </Text>
          <Text
            style={[
              styles.permissionDesc,
              { color: p.textSecondary, fontFamily: "Satoshi-Regular" },
            ]}
          >
            To scan QR codes for session check-in, please allow camera access.
          </Text>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: p.accent }]}
            onPress={requestPermission}
          >
            <Text
              style={{
                color: "#000",
                fontFamily: "Outfit-Bold",
                fontSize: 16,
              }}
            >
              Allow Camera
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera + scanner ──
  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {scanState !== "success" && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanState === "idle" ? handleBarCodeScanned : undefined
          }
        />
      )}

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Dark overlay with cutout */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={[styles.viewfinder]}>
            {/* Corner decorations */}
            <CornerDecoration position="topLeft" />
            <CornerDecoration position="topRight" />
            <CornerDecoration position="bottomLeft" />
            <CornerDecoration position="bottomRight" />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <Pressable
          style={styles.closeButtonCamera}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <X size={24} color="#fff" />
        </Pressable>
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontFamily: "Outfit-Bold",
            letterSpacing: -0.3,
          }}
        >
          Scan QR Code
        </Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* Bottom instruction */}
      {scanState === "idle" && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.instruction}>
          <ScanLine size={20} color="rgba(255,255,255,0.7)" />
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 15,
              fontFamily: "Satoshi-Medium",
              marginLeft: 8,
            }}
          >
            Point at the session QR code
          </Text>
        </Animated.View>
      )}

      {/* Scanning state */}
      {scanState === "scanning" && (
        <View style={styles.statusOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontFamily: "Satoshi-Medium",
              marginTop: 16,
            }}
          >
            Checking in...
          </Text>
        </View>
      )}

      {/* Success state */}
      {scanState === "success" && (
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.resultOverlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}
        >
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: "rgba(34,197,94,0.15)" },
            ]}
          >
            <CheckCircle size={56} color="#22c55e" strokeWidth={1.8} />
          </View>
          <Text
            style={{
              color: "#22c55e",
              fontSize: 28,
              fontFamily: "Outfit-Bold",
              marginTop: 20,
              letterSpacing: -0.5,
            }}
          >
            Checked In!
          </Text>
          {result?.sessionName && (
            <Animated.View entering={FadeInUp.delay(200)}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 16,
                  fontFamily: "Satoshi-Regular",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {result.sessionName}
              </Text>
            </Animated.View>
          )}
          {result?.message && (
            <Animated.View entering={FadeInUp.delay(300)}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 14,
                  fontFamily: "Satoshi-Regular",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {result.message}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* Error state */}
      {scanState === "error" && (
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.resultOverlay, { backgroundColor: "rgba(0,0,0,0.85)" }]}
        >
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: "rgba(239,68,68,0.15)" },
            ]}
          >
            <AlertCircle size={56} color="#ef4444" strokeWidth={1.8} />
          </View>
          <Text
            style={{
              color: "#ef4444",
              fontSize: 22,
              fontFamily: "Outfit-Bold",
              marginTop: 20,
              letterSpacing: -0.3,
            }}
          >
            Check-in Failed
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 15,
              fontFamily: "Satoshi-Regular",
              marginTop: 8,
              textAlign: "center",
              paddingHorizontal: 32,
            }}
          >
            {errorMessage}
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontFamily: "Outfit-Bold",
              }}
            >
              Try Again
            </Text>
          </Pressable>
          <Pressable
            style={styles.dismissButton}
            onPress={() => router.back()}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                fontFamily: "Satoshi-Medium",
              }}
            >
              Close
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ── Corner decoration component ──
function CornerDecoration({
  position,
}: {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}) {
  const isTop = position.includes("top");
  const isLeft = position.includes("Left");
  return (
    <View
      style={[
        styles.corner,
        {
          top: isTop ? -CORNER_THICKNESS / 2 : undefined,
          bottom: !isTop ? -CORNER_THICKNESS / 2 : undefined,
          left: isLeft ? -CORNER_THICKNESS / 2 : undefined,
          right: !isLeft ? -CORNER_THICKNESS / 2 : undefined,
          borderTopWidth: isTop ? CORNER_THICKNESS : 0,
          borderBottomWidth: !isTop ? CORNER_THICKNESS : 0,
          borderLeftWidth: isLeft ? CORNER_THICKNESS : 0,
          borderRightWidth: !isLeft ? CORNER_THICKNESS : 0,
          borderTopLeftRadius: isTop && isLeft ? CORNER_RADIUS : 0,
          borderTopRightRadius: isTop && !isLeft ? CORNER_RADIUS : 0,
          borderBottomLeftRadius: !isTop && isLeft ? CORNER_RADIUS : 0,
          borderBottomRightRadius: !isTop && !isLeft ? CORNER_RADIUS : 0,
        },
      ]}
    />
  );
}

// ── Styles ──
const OVERLAY_COLOR = "rgba(0,0,0,0.55)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Overlay pieces (create a hole in the center)
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddleRow: {
    flexDirection: "row",
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  // Corner decoration
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#fff",
  },
  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  closeButtonCamera: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  // Instruction
  instruction: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  // Status overlay
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  // Buttons
  retryButton: {
    marginTop: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  dismissButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  // Permission
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    marginTop: 20,
  },
  permissionDesc: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    opacity: 0.7,
  },
  permissionButton: {
    marginTop: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
