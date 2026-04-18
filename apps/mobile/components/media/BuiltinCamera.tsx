import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  CameraRecordingOptions,
} from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

interface BuiltinCameraProps {
  visible: boolean;
  onCancel: () => void;
  onRecorded: (asset: {
    uri: string;
    duration: number;
    width: number;
    height: number;
  }) => void;
}

export function BuiltinCamera({
  visible,
  onCancel,
  onRecorded,
}: BuiltinCameraProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();

  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isCancelledRef = useRef(false);
  const recordingPromiseRef = useRef<Promise<
    { uri: string } | undefined
  > | null>(null);

  // Animation values for the record button
  const recordButtonBorderRadius = useRef(new Animated.Value(32)).current;
  const recordButtonScale = useRef(new Animated.Value(1)).current;

  // Request permissions when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    (async () => {
      if (!cameraPermission?.granted || !micPermission?.granted) {
        const [cam, mic] = await Promise.all([
          requestCameraPermission(),
          requestMicPermission(),
        ]);
        if (!cam.granted || !mic.granted) {
          Alert.alert(
            "Permission Required",
            "Camera and microphone access is needed to record videos.",
          );
          onCancel();
        }
      }
    })();
  }, [
    visible,
    cameraPermission,
    micPermission,
    requestCameraPermission,
    requestMicPermission,
    onCancel,
  ]);

  // Cleanup when modal hides
  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      isCancelledRef.current = false;
      recordingPromiseRef.current = null;
      setIsRecording(false);
      setSeconds(0);

      // Reset animations
      recordButtonBorderRadius.setValue(32);
      recordButtonScale.setValue(1);
    }
  }, [visible, recordButtonBorderRadius, recordButtonScale]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setSeconds(0);

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }
    startTimeRef.current = null;
  }, []);

  const animateRecordButton = (recording: boolean) => {
    Animated.parallel([
      Animated.spring(recordButtonBorderRadius, {
        toValue: recording ? 8 : 32,
        useNativeDriver: false, // borderRadius does not support native driver
        speed: 20,
      }),
      Animated.spring(recordButtonScale, {
        toValue: recording ? 0.6 : 1,
        useNativeDriver: false,
        speed: 20,
      }),
    ]).start();
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    isCancelledRef.current = false;
    setIsRecording(true);
    animateRecordButton(true);
    startTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const options: CameraRecordingOptions = {
        maxDuration: 180,
      };

      recordingPromiseRef.current = cameraRef.current.recordAsync(options);
      const video = await recordingPromiseRef.current;

      // If the user cancelled while the camera was warming up
      if (isCancelledRef.current || !video) return;

      const elapsed =
        startTimeRef.current != null
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : seconds;
      onRecorded({
        uri: video.uri,
        duration: elapsed,
        width: 1280,
        height: 720,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert(
        "Recording Failed",
        "Something went wrong. Please try again.",
      );
    } finally {
      setIsRecording(false);
      animateRecordButton(false);
      stopTimer();
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    try {
      cameraRef.current.stopRecording();
    } catch (err) {
      console.error("Stop error:", err);
    }
  };

  const handleRecordPress = () => {
    if (isRecording) {
      isCancelledRef.current = false;
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCancel = async () => {
    isCancelledRef.current = true;
    if (isRecording) {
      await stopRecording();
    }
    onCancel();
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === "off" ? "on" : "off"));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <StatusBar hidden />

        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
          mode="video"
          videoQuality="720p"
          responsiveOrientationWhenOrientationLocked
        />

        <View style={styles.overlay}>
          {/* Header */}
          <View
            style={[styles.header, { marginTop: Math.max(insets.top, 20) }]}
          >
            <TouchableOpacity onPress={handleCancel} disabled={isRecording}>
              <BlurView intensity={30} tint="dark" style={styles.iconButton}>
                <Feather name="x" size={24} color="white" />
              </BlurView>
            </TouchableOpacity>

            {isRecording && (
              <BlurView
                intensity={30}
                tint="dark"
                style={styles.timerContainer}
              >
                <View style={styles.redDot} />
                <Text style={styles.timerText}>{formatTime(seconds)}</Text>
              </BlurView>
            )}

            <TouchableOpacity onPress={toggleFlash} disabled={isRecording}>
              <BlurView intensity={30} tint="dark" style={styles.iconButton}>
                <Feather
                  name={flash === "on" ? "zap" : "zap-off"}
                  size={20}
                  color={flash === "on" ? "#fbbf24" : "white"}
                />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { marginBottom: Math.max(insets.bottom, 40) },
            ]}
          >
            <View style={styles.footerSide} />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRecordPress}
              style={[
                styles.recordButtonLayout,
                isRecording && styles.recordingActiveLayout,
              ]}
              disabled={!cameraPermission?.granted || !micPermission?.granted}
            >
              <Animated.View
                style={[
                  styles.recordButtonInner,
                  {
                    borderRadius: recordButtonBorderRadius,
                    transform: [{ scale: recordButtonScale }],
                  },
                ]}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleFacing} disabled={isRecording}>
              <BlurView intensity={30} tint="dark" style={styles.flipButton}>
                <Feather name="refresh-cw" size={20} color="white" />
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
    overflow: "hidden",
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  timerText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerSide: {
    width: 50,
  },
  recordButtonLayout: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingActiveLayout: {
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    backgroundColor: "#ef4444",
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
